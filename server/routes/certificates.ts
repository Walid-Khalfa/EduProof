import { Router, Request, Response } from "express";
import { getSupabaseClient } from "../services/supabase";
import { normalize } from "../utils/normalize";
import { createPublicClient, http, parseAbi } from "viem";
import type { SupabaseClient } from "@supabase/supabase-js";

const router = Router();

/**
 * Query blockchain for NFTs owned by an address (DISABLED FOR DEMO)
 * Returns empty array - DB query is primary source
 */
async function queryChainForOwner(ownerAddress: string, supabase: SupabaseClient): Promise<any[]> {
  console.log(`[queryChainForOwner] Skipped (demo mode - DB only)`);
  return [];
}

/**
 * Check if a certificate ID is available for a given institution
 * GET /api/certificates/availability?institution=...&certId=...
 */
router.get("/api/certificates/availability", async (req: Request, res: Response) => {
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

    // First, get or create institution
    const { data: instData, error: instError } = await supabase
      .from("institutions")
      .select("id")
      .eq("name_normalized", institutionN)
      .maybeSingle();

    if (instError) {
      console.error("[certificates/availability] Institution lookup error:", instError);
      throw instError;
    }

    if (!instData) {
      // Institution doesn't exist yet, so certificate ID is available
      return res.json({ 
        ok: true, 
        available: true,
        message: "Certificate ID is available (new institution)"
      });
    }

    // Check if cert ID exists for this institution
    const { data, error } = await supabase
      .from("certificates")
      .select("id")
      .eq("institution_id", instData.id)
      .eq("cert_id_normalized", certIdN)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[certificates/availability] DB error:", error);
      throw error;
    }

    res.json({ 
      ok: true, 
      available: !data,
      message: data ? "Certificate ID already exists" : "Certificate ID is available"
    });
  } catch (e: any) {
    console.error("[certificates/availability] Error:", e);
    res.status(500).json({ 
      ok: false, 
      error: String(e?.message || e) 
    });
  }
});

/**
 * Check for duplicate certificate before minting
 * POST /api/certificates/check-duplicate
 */
router.post("/api/certificates/check-duplicate", async (req: Request, res: Response) => {
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

    const { data: existingCert } = await supabase
      .from("certificates")
      .select("id, cert_id, owner, ocr_json")
      .eq("owner", String(b.owner || "").toLowerCase())
      .not("ocr_json", "is", null)
      .limit(100);
    
    if (existingCert && existingCert.length > 0) {
      const duplicate = existingCert.find(cert => {
        if (!cert.ocr_json) return false;
        const ocr = cert.ocr_json as any;
        return (
          normalize(ocr.student_name || "") === normalize(student_name) &&
          normalize(ocr.course_name || "") === normalize(course_name) &&
          normalize(ocr.institution || "") === normalize(institution) &&
          normalize(ocr.issue_date || "") === normalize(issue_date)
        );
      });
      
      if (duplicate) {
        console.log(`[certificates/check-duplicate] ⚠️ Duplicate found:`, {
          existingCertId: duplicate.cert_id,
          owner: duplicate.owner,
        });
        
        return res.json({ 
          ok: true, 
          exists: true,
          existingCertId: duplicate.cert_id
        });
      }
    }

    res.json({ ok: true, exists: false });
  } catch (e: any) {
    console.error("[certificates/check-duplicate] Error:", e);
    res.status(500).json({ 
      ok: false, 
      error: String(e?.message || e) 
    });
  }
});

/**
 * Index a minted certificate in the database
 * POST /api/certificates/index
 */
router.post("/api/certificates/index", async (req: Request, res: Response) => {
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
    // Generate certId from institution + timestamp if not provided
    const certId = String(b.certId || `${institution}-${Date.now()}`);
    
    const institutionN = normalize(institution);
    const certIdN = normalize(certId);
    
    if (!institutionN) {
      return res.status(400).json({ 
        ok: false, 
        error: "MISSING_FIELDS",
        message: "Institution is required" 
      });
    }

    // Check for duplicate certificate based on OCR data
    if (b.ocrJson) {
      const { student_name, course_name, institution: ocrInstitution, issue_date } = b.ocrJson;
      
      if (student_name && course_name && ocrInstitution && issue_date) {
        const { data: existingCert } = await supabase
          .from("certificates")
          .select("id, cert_id, owner, ocr_json")
          .eq("owner", String(b.owner || "").toLowerCase())
          .not("ocr_json", "is", null)
          .limit(100);
        
        if (existingCert && existingCert.length > 0) {
          // Check if any existing cert has matching OCR data
          const duplicate = existingCert.find(cert => {
            if (!cert.ocr_json) return false;
            const ocr = cert.ocr_json as any;
            return (
              normalize(ocr.student_name || "") === normalize(student_name) &&
              normalize(ocr.course_name || "") === normalize(course_name) &&
              normalize(ocr.institution || "") === normalize(ocrInstitution) &&
              normalize(ocr.issue_date || "") === normalize(issue_date)
            );
          });
          
          if (duplicate) {
            console.log(`[certificates/index] ⚠️ Duplicate certificate detected:`, {
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
          wallet: b.owner || null
        })
        .select("id")
        .single();

      if (instError) {
        console.error("[certificates/index] Institution creation error:", instError);
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
      chain_id: b.chainId || null,
      contract: String(b.contract || "").toLowerCase(),
      token_id: String(b.tokenId || ""),
      owner: String(b.owner || "").toLowerCase(),
      token_uri: b.tokenUri || null,
      image_cid: b.imageCid || null,
      meta_cid: b.metaCid || null,
      tx_hash: b.txHash || null,
      score: b.score ?? null,
      ocr_json: b.ocrJson || null,
      verification_url: b.verificationUrl || null,
      status: b.status || 'minted'
    };

    console.log(`[certificates/index] Indexing certificate:`, {
      certId,
      institution,
      owner: row.owner,
      contract: row.contract,
      tokenId: row.token_id,
      chainId: row.chain_id
    });

    // Use tx_hash as unique identifier when tokenId is missing
    const upsertOptions = row.token_id 
      ? { onConflict: 'contract,token_id', ignoreDuplicates: false }
      : {};
    
    const { data, error } = await supabase
      .from("certificates")
      .upsert(row, upsertOptions)
      .select()
      .single();

    if (error) {
      console.error("[certificates/index] DB error:", error);
      console.error("[certificates/index] Failed row:", row);
      throw error;
    }

    console.log(`✅ Certificate indexed: ${certId} for ${institution} (owner: ${row.owner})`);
    res.status(201).json({ ok: true, certificate: data });
  } catch (e: any) {
    console.error("[certificates/index] Error:", e);
    res.status(500).json({ 
      ok: false, 
      error: String(e?.message || e) 
    });
  }
});

/**
 * Get certificates for a specific owner
 * GET /api/certificates/owner/:address
 * GET /api/certificates/owner/:address?source=chain (force chain query)
 */
router.get("/api/certificates/owner/:address", async (req: Request, res: Response) => {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return res.status(503).json({ 
        ok: false, 
        error: "DATABASE_NOT_CONFIGURED",
        message: "Database service is not available" 
      });
    }

    const address = req.params.address?.toLowerCase();
    const source = req.query.source as string;
    
    if (!address) {
      return res.status(400).json({ 
        ok: false, 
        error: "MISSING_ADDRESS" 
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
      console.error("[certificates/owner] DB error:", error);
      throw error;
    }

    // Add derived 'verified' property from status
    let certificates = (data || []).map(cert => ({
      ...cert,
      institutions: cert.institutions ? {
        ...cert.institutions,
        verified: cert.institutions.status === 'approved'
      } : null
    }));

    // Chain query disabled for demo (devnet contract issues)
    console.log(`[certificates/owner] Returning ${certificates.length} certificates from DB (chain query disabled)`);
    // if (source === 'chain' || certificates.length === 0) {
    //   Chain query disabled - DB is source of truth
    // }

    res.json({ ok: true, certificates });
  } catch (e: any) {
    console.error("[certificates/owner] Error:", e);
    res.status(500).json({ 
      ok: false, 
      error: String(e?.message || e) 
    });
  }
});

/**
 * Verify a certificate by various methods
 * GET /api/certificates/verify?certId=...&institution=...
 * GET /api/certificates/verify?tokenURI=...
 * GET /api/certificates/verify?txHash=...
 * GET /api/certificates/verify?contract=...&tokenId=...
 */
router.get("/api/certificates/verify", async (req: Request, res: Response) => {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return res.status(503).json({ 
        ok: false, 
        error: "DATABASE_NOT_CONFIGURED",
        message: "Database service is not available" 
      });
    }

    const { certId, institution, tokenURI, txHash, contract, tokenId } = req.query;

    let query = supabase.from("certificates").select("*");

    if (certId && institution) {
      const institutionN = normalize(String(institution));
      const certIdN = normalize(String(certId));
      
      // Get institution ID first
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
      console.error("[certificates/verify] DB error:", error);
      throw error;
    }

    if (!data) {
      return res.json({ 
        ok: true, 
        found: false,
        message: "Certificate not found in database" 
      });
    }

    // Add derived 'verified' property from status
    const certificate = data.institutions ? {
      ...data,
      institutions: {
        ...data.institutions,
        verified: data.institutions.status === 'approved'
      }
    } : data;

    res.json({ 
      ok: true, 
      found: true,
      certificate 
    });
  } catch (e: any) {
    console.error("[certificates/verify] Error:", e);
    res.status(500).json({ 
      ok: false, 
      error: String(e?.message || e) 
    });
  }
});

export default router;
