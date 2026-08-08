import { Router, Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { verifyMessage, isAddress } from "viem";
import { getSupabaseClient } from "../services/supabase";
import { normalize } from "../utils/normalize";
import { logger } from "../utils/logger";
import { verifyMintTransaction, verifyTokenOnChain, ChainVerificationError, getChainConfig } from "../services/chain";

const router = Router();

const isProduction = process.env.NODE_ENV === "production";

const INDEX_MESSAGE_PREFIX = "EduProof Cert Index:";

/**
 * PostgREST returns a to-one foreign-key join as a single object (or null),
 * but supabase-js may type it as an array. Normalize to the object form.
 */
function resolveInstitution(join: unknown): Record<string, unknown> | null {
  const inst = Array.isArray(join) ? join[0] : join;
  return inst && typeof inst === "object" ? (inst as Record<string, unknown>) : null;
}

/**
 * Computes a stable dedup hash over the normalized OCR fields of a
 * certificate. Backed by a partial unique index on (owner, ocr_dedup_hash)
 * so duplicate detection does not rely on a 100-row in-memory scan.
 */
function computeOcrDedupHash(ocrJson: unknown): string | null {
  if (!ocrJson || typeof ocrJson !== "object") return null;
  const { student_name, course_name, institution, issue_date } = ocrJson as Record<string, unknown>;
  if (!student_name || !course_name || !institution || !issue_date) return null;
  const joined = [student_name, course_name, institution, issue_date]
    .map((f) => normalize(String(f)))
    .join("|");
  return crypto.createHash("sha256").update(joined).digest("hex");
}

/**
 * Requires an EIP-191 signature from the certificate owner over a message
 * bound to the exact transaction hash being indexed. This proves the caller
 * controls the wallet that sent the mint transaction, and prevents anyone
 * from re-indexing public transaction data with forged metadata.
 */
async function verifyIndexSignature(
  req: Request,
  txHash: string,
  owner: string
): Promise<{ ok: boolean; reason?: string }> {
  const walletHeader = (req.headers["x-wallet-address"] as string || "").toLowerCase();
  const message = req.headers["x-message"] as string;
  const signature = req.headers["x-signature"] as string;

  if (!walletHeader || walletHeader !== owner || !message || !signature) {
    return { ok: false, reason: "missing or mismatched auth headers" };
  }
  if (message !== `${INDEX_MESSAGE_PREFIX} ${txHash}`) {
    return { ok: false, reason: "signature not bound to this transaction" };
  }
  try {
    const recovered = await verifyMessage({
      address: walletHeader as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    });
    if (!recovered) {
      return { ok: false, reason: "signature does not match wallet" };
    }
  } catch {
    return { ok: false, reason: "invalid signature" };
  }
  return { ok: true };
}

/** Parses a client-supplied value into a non-negative integer or null. */
function parseOptionalInt(value: unknown, label: string): { value: number | null; error?: string } {
  if (value === undefined || value === null || value === "") {
    return { value: null };
  }
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) {
    return { value: null, error: `${label} must be a non-negative integer` };
  }
  return { value: n };
}

/**
 * Check if a certificate ID is available for a given institution
 * GET /api/certificates/availability?institution=...&certId=...
 */
router.get("/api/certificates/availability", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return res.status(503).json({
        ok: false,
        error: "DATABASE_NOT_CONFIGURED",
        message: "Database service is not available"
      });
    }

    const institution = String(req.query.institution || "");
    const certId = String(req.query.certId || "");

    const institutionN = normalize(institution);
    const certIdN = normalize(certId);

    if (!institutionN || !certIdN) {
      return res.status(400).json({
        ok: false,
        error: "MISSING_FIELDS",
        message: "Both institution and certId are required"
      });
    }

    const { data: instData, error: instError } = await supabase
      .from("institutions")
      .select("id")
      .eq("name_normalized", institutionN)
      .maybeSingle();

    if (instError) {
      logger.error("certificates/availability institution lookup error", { error: instError });
      throw instError;
    }

    if (!instData) {
      return res.json({
        ok: true,
        available: true,
        message: "Certificate ID is available (new institution)"
      });
    }

    const { data, error } = await supabase
      .from("certificates")
      .select("id")
      .eq("institution_id", instData.id)
      .eq("cert_id_normalized", certIdN)
      .limit(1)
      .maybeSingle();

    if (error) {
      logger.error("certificates/availability DB error", { error });
      throw error;
    }

    res.json({
      ok: true,
      available: !data,
      message: data ? "Certificate ID already exists" : "Certificate ID is available"
    });
  } catch (e) {
    logger.error("certificates/availability error", { error: e });
    next(e);
  }
});

/**
 * Check for duplicate certificate before minting
 * POST /api/certificates/check-duplicate
 */
router.post("/api/certificates/check-duplicate", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return res.status(503).json({
        ok: false,
        error: "DATABASE_NOT_CONFIGURED",
        message: "Database service is not available"
      });
    }

    const b = req.body || {};

    if (!b.ocrJson) {
      return res.json({ ok: true, exists: false });
    }

    const { student_name, course_name, institution, issue_date } = b.ocrJson;

    if (!student_name || !course_name || !institution || !issue_date) {
      return res.json({ ok: true, exists: false });
    }

    const dedupHash = computeOcrDedupHash(b.ocrJson);
    if (dedupHash) {
      // Exact lookup backed by the partial unique index (owner, ocr_dedup_hash):
      // no in-memory scan, no row limit.
      const { data: existingCert } = await supabase
        .from("certificates")
        .select("id, cert_id, owner")
        .eq("owner", String(b.owner || "").toLowerCase())
        .eq("ocr_dedup_hash", dedupHash)
        .maybeSingle();

      if (existingCert) {
        logger.info("Duplicate certificate found", {
          existingCertId: existingCert.cert_id,
          owner: existingCert.owner
        });

        return res.json({
          ok: true,
          exists: true,
          existingCertId: existingCert.cert_id
        });
      }
    }

    res.json({ ok: true, exists: false });
  } catch (e) {
    logger.error("certificates/check-duplicate error", { error: e });
    next(e);
  }
});

/**
 * Index a minted certificate in the database
 * POST /api/certificates/index
 */
router.post("/api/certificates/index", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return res.status(503).json({
        ok: false,
        error: "DATABASE_NOT_CONFIGURED",
        message: "Database service is not available"
      });
    }

    const b = req.body || {};

    const institution = String(b.institution || "");
    const certId = String(b.certId || `${institution}-${Date.now()}`);
    const txHash = String(b.txHash || "");

    const institutionN = normalize(institution);
    const certIdN = normalize(certId);

    if (!institutionN) {
      return res.status(400).json({
        ok: false,
        error: "MISSING_FIELDS",
        message: "Institution is required"
      });
    }

    if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
      return res.status(400).json({
        ok: false,
        error: "MISSING_TX_HASH",
        message: "A valid transaction hash is required to index a certificate"
      });
    }

    const owner = String(b.owner || "").toLowerCase();
    if (!isAddress(owner)) {
      return res.status(400).json({
        ok: false,
        error: "MISSING_OWNER",
        message: "A valid owner address is required to index a certificate"
      });
    }

    // The caller must prove control of the owner wallet with a signature
    // bound to the transaction being indexed.
    const authResult = await verifyIndexSignature(req, txHash, owner);
    if (!authResult.ok) {
      logger.warn("Index rejected: missing or invalid owner signature", {
        owner,
        txHash,
        reason: authResult.reason
      });
      return res.status(401).json({
        ok: false,
        error: "UNAUTHORIZED_INDEX",
        message: "A signature from the certificate owner wallet is required to index a certificate"
      });
    }

    // Verify the mint transaction on-chain before trusting the payload.
    // In production the API fails closed if the chain is not configured.
    const chainConfig = getChainConfig();
    if (chainConfig.configured) {
      try {
        const verification = await verifyMintTransaction(txHash, {
          owner,
          tokenId: b.tokenId ? String(b.tokenId) : undefined,
        });
        b.tokenId = verification.tokenId;
        logger.debug("Mint transaction verified on-chain", {
          txHash,
          tokenId: verification.tokenId,
          institution: verification.institution
        });
      } catch (e) {
        if (e instanceof ChainVerificationError) {
          logger.warn("Index rejected: on-chain verification failed", {
            txHash,
            reason: e.message
          });
          return res.status(422).json({
            ok: false,
            error: "INVALID_TRANSACTION",
            message: "The transaction could not be verified on-chain",
            reason: e.message
          });
        }
        throw e;
      }
    } else if (isProduction) {
      logger.error("Index rejected: chain not configured", { txHash });
      return res.status(503).json({
        ok: false,
        error: "CHAIN_NOT_CONFIGURED",
        message: "On-chain verification is not configured on this server"
      });
    } else {
      logger.warn("Index accepted WITHOUT on-chain verification (development mode - RPC_URL/CERTIFICATE_CONTRACT not set)");
    }

    const parsedTokenId = parseOptionalInt(b.tokenId, "tokenId");
    if (parsedTokenId.error) {
      return res.status(400).json({ ok: false, error: "INVALID_TOKEN_ID", message: parsedTokenId.error });
    }
    const parsedChainId = parseOptionalInt(b.chainId, "chainId");
    if (parsedChainId.error) {
      return res.status(400).json({ ok: false, error: "INVALID_CHAIN_ID", message: parsedChainId.error });
    }

    // Score is clamped to 0-100; it is a client-side OCR confidence estimate
    // and is never trusted for verification decisions.
    let score: number | null = null;
    const rawScore = b.score;
    if (rawScore !== undefined && rawScore !== null && rawScore !== "") {
      const n = Number(rawScore);
      if (!Number.isFinite(n)) {
        return res.status(400).json({ ok: false, error: "INVALID_SCORE", message: "score must be a finite number" });
      }
      score = Math.min(100, Math.max(0, Math.round(n)));
    }

    const statusValue = b.status === undefined || b.status === null || b.status === "" ? "minted" : String(b.status);
    if (!["minted", "revoked"].includes(statusValue)) {
      return res.status(400).json({ ok: false, error: "INVALID_STATUS", message: "status must be 'minted' or 'revoked'" });
    }

    // The contract address is pinned server-side: the client can never
    // steer verification toward a contract it controls.
    const contractAddress = getChainConfig().certificateContract || null;

    // Check for duplicate certificate based on OCR data
    if (b.ocrJson) {
      const { student_name, course_name, institution: ocrInstitution, issue_date } = b.ocrJson;

      if (student_name && course_name && ocrInstitution && issue_date) {
        const { data: existingCert } = await supabase
          .from("certificates")
          .select("id, cert_id, owner, ocr_json")
          .eq("owner", owner)
          .not("ocr_json", "is", null);

        if (existingCert && existingCert.length > 0) {
          const duplicate = existingCert.find(cert => {
            if (!cert.ocr_json) return false;
            const ocr = cert.ocr_json;
            return (
              normalize(ocr.student_name || "") === normalize(student_name) &&
              normalize(ocr.course_name || "") === normalize(course_name) &&
              normalize(ocr.institution || "") === normalize(ocrInstitution) &&
              normalize(ocr.issue_date || "") === normalize(issue_date)
            );
          });

          if (duplicate) {
            logger.info("Duplicate certificate detected", {
              existingCertId: duplicate.cert_id,
              owner: duplicate.owner,
              studentName: student_name,
              courseName: course_name
            });

            return res.status(409).json({
              ok: false,
              error: "DUPLICATE_CERTIFICATE",
              message: "A certificate with identical details already exists",
              existingCertId: duplicate.cert_id
            });
          }
        }
      }
    }

    // Get or create institution
    let institutionId: string;
    const { data: existingInst } = await supabase
      .from("institutions")
      .select("id")
      .eq("name_normalized", institutionN)
      .maybeSingle();

    if (existingInst) {
      institutionId = existingInst.id;
    } else {
      const { data: newInst, error: instError } = await supabase
        .from("institutions")
        .insert({
          name: institution,
          name_normalized: institutionN,
          wallet: owner,
          status: 'revoked'
        })
        .select("id")
        .single();

      if (instError) {
        logger.error("certificates/index institution creation error", { error: instError });
        throw instError;
      }
      institutionId = newInst.id;
    }

    const row = {
      cert_id: certId,
      cert_id_normalized: certIdN,
      institution_id: institutionId,
      institution: institution,
      institution_norm: institutionN,
      chain_id: parsedChainId.value,
      contract: contractAddress,
      token_id: parsedTokenId.value,
      owner,
      token_uri: b.tokenUri || null,
      image_cid: b.imageCid || null,
      meta_cid: b.metaCid || null,
      tx_hash: b.txHash || null,
      score,
      ocr_json: b.ocrJson || null,
      ocr_dedup_hash: computeOcrDedupHash(b.ocrJson),
      verification_url: b.verificationUrl || null,
      status: statusValue
    };

    logger.info("Indexing certificate", {
      certId,
      institution,
      owner: row.owner,
      contract: row.contract,
      tokenId: row.token_id,
      chainId: row.chain_id
    });

    // Use tx_hash as unique identifier when tokenId is missing
    const upsertOptions = row.token_id !== null && contractAddress
      ? { onConflict: 'contract,token_id', ignoreDuplicates: false }
      : {};

    const { data, error } = await supabase
      .from("certificates")
      .upsert(row, upsertOptions)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        logger.info("Index rejected: duplicate certificate", { certId, owner });
        return res.status(409).json({
          ok: false,
          error: "DUPLICATE_CERTIFICATE",
          message: "A certificate with identical details already exists"
        });
      }
      logger.error("certificates/index DB error", { error, row });
      throw error;
    }

    logger.info("Certificate indexed", { certId, institution, owner: row.owner });
    res.status(201).json({ ok: true, certificate: data });
  } catch (e) {
    logger.error("certificates/index error", { error: e });
    next(e);
  }
});

router.get("/api/certificates/owner/:address", async (req: Request, res: Response, next: NextFunction) => {

/**
 * Get certificates for a specific owner
 * GET /api/certificates/owner/:address
 * GET /api/certificates/owner/:address?source=chain (force chain query)
 */
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return res.status(503).json({
        ok: false,
        error: "DATABASE_NOT_CONFIGURED",
        message: "Database service is not available"
      });
    }

    const address = String(req.params.address || "").toLowerCase();

    if (!isAddress(address)) {
      return res.status(400).json({
        ok: false,
        error: "MISSING_ADDRESS",
        message: "A valid wallet address is required"
      });
    }

    // Query database first
    const { data, error } = await supabase
      .from("certificates")
      .select(`
        id,
        cert_id,
        cert_id_normalized,
        institution_id,
        institution,
        institution_norm,
        token_id,
        owner,
        token_uri,
        image_cid,
        meta_cid,
        tx_hash,
        score,
        ocr_json,
        verification_url,
        status,
        chain_id,
        contract,
        created_at,
        institutions (
          id,
          name,
          name_normalized,
          wallet,
          status,
          did_uri,
          min_score,
          created_at
        )
      `)
      .eq("owner", address.toLowerCase())
      .order("created_at", { ascending: false });

    if (error) {
      logger.error("certificates/owner DB error", { error });
      throw error;
    }

    const certificates = (data || []).map(cert => {
      const institutions = resolveInstitution(cert.institutions);
      return {
        ...cert,
        institutions: institutions ? {
          ...institutions,
          verified: institutions.status === 'approved'
        } : null
      };
    });

    logger.debug("certificates/owner returning certs from DB", { count: certificates.length, chainQueryDisabled: true });

    res.json({ ok: true, certificates });
  } catch (e) {
    logger.error("certificates/owner error", { error: e });
    next(e);
  }
});

/**
 * Verify a certificate by various methods
 * GET /api/certificates/verify?certId=...&institution=...
 * GET /api/certificates/verify?tokenURI=...
 * GET /api/certificates/verify?txHash=...
 * GET /api/certificates/verify?contract=...&tokenId=...
 */
router.get("/api/certificates/verify", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return res.status(503).json({
        ok: false,
        error: "DATABASE_NOT_CONFIGURED",
        message: "Database service is not available"
      });
    }

    const { certId, institution, txHash, contract, tokenId } = req.query;

    let query = supabase.from("certificates").select("*");

    if (certId && institution) {
      const institutionN = normalize(String(institution));
      const certIdN = normalize(String(certId));

      const { data: instData } = await supabase
        .from("institutions")
        .select("id")
        .eq("name_normalized", institutionN)
        .maybeSingle();

      if (!instData) {
        return res.json({
          ok: true,
          found: false,
          message: "Institution not found"
        });
      }

      query = query
        .select(`
          id,
          cert_id,
          cert_id_normalized,
          institution_id,
          institution,
          institution_norm,
          token_id,
          owner,
          token_uri,
          image_cid,
          meta_cid,
          tx_hash,
          score,
          ocr_json,
          verification_url,
          status,
          chain_id,
          contract,
          created_at,
          institutions (
            id,
            name,
            name_normalized,
            wallet,
            status,
            did_uri,
            min_score,
            created_at
          )
        `)
        .eq("institution_id", instData.id)
        .eq("cert_id_normalized", certIdN);
    } else if (txHash) {
      query = query
        .select(`
          id,
          cert_id,
          cert_id_normalized,
          institution_id,
          institution,
          institution_norm,
          token_id,
          owner,
          token_uri,
          image_cid,
          meta_cid,
          tx_hash,
          score,
          ocr_json,
          verification_url,
          status,
          chain_id,
          contract,
          created_at,
          institutions (
            id,
            name,
            name_normalized,
            wallet,
            status,
            did_uri,
            min_score,
            created_at
          )
        `)
        .eq("tx_hash", String(txHash));
    } else if (contract && tokenId) {
      query = query
        .select(`
          id,
          cert_id,
          cert_id_normalized,
          institution_id,
          institution,
          institution_norm,
          token_id,
          owner,
          token_uri,
          image_cid,
          meta_cid,
          tx_hash,
          score,
          ocr_json,
          verification_url,
          status,
          chain_id,
          contract,
          created_at,
          institutions (
            id,
            name,
            name_normalized,
            wallet,
            status,
            did_uri,
            min_score,
            created_at
          )
        `)
        .eq("contract", String(contract).toLowerCase())
        .eq("token_id", String(tokenId));
    } else {
      return res.status(400).json({
        ok: false,
        error: "MISSING_PARAMS",
        message: "Provide either (certId + institution), (contract + tokenId), tokenURI, or txHash"
      });
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      logger.error("certificates/verify DB error", { error });
      throw error;
    }

    if (!data) {
      return res.json({
        ok: true,
        found: false,
        message: "Certificate not found in database"
      });
    }

    const institutions = resolveInstitution(data.institutions);
    const certificate = institutions ? {
      ...data,
      institutions: {
        ...institutions,
        verified: institutions.status === 'approved'
      }
    } : data;

    // Cross-check the certificate against the blockchain when chain is configured
    let onChain: Record<string, unknown> | null = null;
    const contractAddress = String(certificate.contract || "");
    if (contractAddress && certificate.token_id !== null && certificate.token_id !== undefined && certificate.token_id !== "") {
      try {
        const chainResult = await verifyTokenOnChain(
          certificate.token_id,
          contractAddress,
          certificate.owner || undefined
        );
        onChain = {
          verified: chainResult.verified,
          owner: chainResult.owner,
          status: chainResult.status,
          contract: contractAddress,
          tokenId: certificate.token_id,
          chainId: certificate.chain_id || null
        };
      } catch (e) {
        if (e instanceof ChainVerificationError) {
          logger.warn("verify: on-chain cross-check unavailable", { reason: e.message });
          onChain = { verified: null, reason: e.message };
        } else {
          logger.error("verify: on-chain cross-check error", { error: e });
          onChain = { verified: null, reason: "RPC_ERROR" };
        }
      }
    }

    res.json({
      ok: true,
      found: true,
      certificate,
      onChain
    });
  } catch (e) {
    logger.error("certificates/verify error", { error: e });
    next(e);
  }
});

export default router;
