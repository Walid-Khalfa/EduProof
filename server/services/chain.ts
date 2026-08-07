import { createPublicClient, http, parseAbiItem, decodeEventLog, isAddress } from "viem";
import { logger } from "../utils/logger";

const DEFAULT_RPC_URL = "https://dev-rpc.codenut.dev";

export interface ChainConfig {
  rpcUrl: string;
  certificateContract: string;
  configured: boolean;
}

export function getChainConfig(): ChainConfig {
  const rpcUrl = process.env.RPC_URL || DEFAULT_RPC_URL;
  const certificateContract = (process.env.CERTIFICATE_CONTRACT || "").toLowerCase();
  return {
    rpcUrl,
    certificateContract,
    configured: isAddress(certificateContract),
  };
}

function getPublicClient() {
  const { rpcUrl } = getChainConfig();
  return createPublicClient({ transport: http(rpcUrl) });
}

const mintedEvent = parseAbiItem(
  "event Minted(uint256 indexed tokenId, address indexed institution, bytes32 studentHash, bytes32 certificateHash)"
);

export interface MintVerification {
  tokenId: string;
  institution: string;
}

export class ChainVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChainVerificationError";
  }
}

/**
 * Verifies that a transaction is a successful mint on the EduProofCertificate
 * contract and that the tokenId/owner match the supplied payload.
 */
export async function verifyMintTransaction(
  txHash: string,
  options: { owner?: string; tokenId?: string }
): Promise<MintVerification> {
  const config = getChainConfig();
  if (!config.configured) {
    throw new ChainVerificationError("CHAIN_NOT_CONFIGURED");
  }

  if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
    throw new ChainVerificationError("INVALID_TX_HASH_FORMAT");
  }

  const client = getPublicClient();

  let receipt;
  try {
    receipt = await client.getTransactionReceipt({ hash: txHash as `0x${string}` });
  } catch (e) {
    const detail = e instanceof Error ? String(e.message) : String(e);
    logger.warn("Mint verification: transaction receipt not found", { txHash, error: detail });
    throw new ChainVerificationError("TX_NOT_FOUND");
  }

  if (receipt.status !== "success") {
    throw new ChainVerificationError("TX_FAILED");
  }

  if (!receipt.to) {
    throw new ChainVerificationError("TX_NOT_TO_CONTRACT");
  }

  if (receipt.to.toLowerCase() !== config.certificateContract) {
    throw new ChainVerificationError("TX_WRONG_CONTRACT");
  }

  let decodedMinted: { tokenId: bigint; institution: string } | null = null;
  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({
        abi: [mintedEvent],
        topics: log.topics,
        data: log.data,
      });
      if (decoded.eventName === "Minted") {
        decodedMinted = {
          tokenId: BigInt(String(decoded.args.tokenId)),
          institution: String(decoded.args.institution).toLowerCase(),
        };
        break;
      }
    } catch {
      // Ignore logs that don't match the Minted event
    }
  }

  if (!decodedMinted) {
    throw new ChainVerificationError("MINTED_EVENT_NOT_FOUND");
  }

  if (options.tokenId !== undefined && BigInt(String(options.tokenId)) !== decodedMinted.tokenId) {
    throw new ChainVerificationError("TOKEN_ID_MISMATCH");
  }

  if (options.owner) {
    const owner = options.owner.toLowerCase();
    const txSender = (receipt.from || "").toLowerCase();
    if (owner !== txSender) {
      throw new ChainVerificationError("OWNER_NOT_TX_SENDER");
    }
  }

  return {
    tokenId: decodedMinted.tokenId.toString(),
    institution: decodedMinted.institution,
  };
}

/**
 * Verifies that a token exists on-chain, belongs to the given owner, and
 * reports its revocation status. Used by the verify endpoint to cross-check
 * the database record against the blockchain.
 */
export async function verifyTokenOnChain(
  tokenId: string | number,
  contractAddress: string,
  owner?: string
): Promise<{ owner: string; status: string; verified: boolean }> {
  const config = getChainConfig();
  if (!config.configured || !isAddress(contractAddress)) {
    throw new ChainVerificationError("CHAIN_NOT_CONFIGURED");
  }

  const client = getPublicClient();
  const abi = [
    parseAbiItem("function ownerOf(uint256 tokenId) external view returns (address)"),
    parseAbiItem("function status(uint256 tokenId) external view returns (string)"),
  ];

  const [tokenOwner, tokenStatus] = await Promise.all([
    client.readContract({ address: contractAddress as `0x${string}`, abi, functionName: "ownerOf", args: [BigInt(String(tokenId))] }),
    client.readContract({ address: contractAddress as `0x${string}`, abi, functionName: "status", args: [BigInt(String(tokenId))] }),
  ]);

  const ownerOk = owner ? tokenOwner.toLowerCase() === owner.toLowerCase() : true;

  return {
    owner: tokenOwner,
    status: tokenStatus as string,
    verified: ownerOk && tokenStatus !== "Revoked",
  };
}
