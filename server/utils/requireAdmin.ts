import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { verifyMessage } from 'viem';
import { logger } from '../utils/logger';

const AUTH_MESSAGE_PREFIX = 'EduProof Admin Auth:';
const MAX_MESSAGE_AGE_SECONDS = 5 * 60;

/** Timing-safe comparison: compare digests so length is not observable. */
function safeEqual(a: string, b: string): boolean {
  const ha = crypto.createHash('sha256').update(a).digest();
  const hb = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

/**
 * Hashes the request body so the signed message cannot be replayed against
 * a different payload. Empty bodies hash to the empty string.
 */
function computeBodyHash(body: unknown): string {
  if (body === undefined || body === null) return '';
  const keys = Object.keys(body as object);
  if (keys.length === 0) return '';
  return crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex');
}

/**
 * Builds the message a client must sign for a specific request:
 * "EduProof Admin Auth: <unixSeconds>:<METHOD>:<path>[:<bodyHash>]".
 * Binding method + path + body hash means a signature captured on one
 * request cannot be replayed on another, even within the freshness window.
 */
export function buildAdminAuthMessage(nowSeconds: number, method: string, path: string, bodyHash = ''): string {
  return `${AUTH_MESSAGE_PREFIX} ${nowSeconds}:${method}:${path}:${bodyHash}`;
}

/**
 * Middleware to require admin authentication.
 * Requires either:
 * 1. Admin API key (ADMIN_API_KEY env var via x-admin-key header, compared
 *    in constant time)
 * 2. Wallet allowlist (ADMIN_WALLETS env var) with a fresh EIP-191 signature
 *    proving ownership of the wallet (x-wallet-address + x-message + x-signature),
 *    where the message is bound to the method, path and body of this request.
 *
 * The wallet path requires a signature of the exact message
 * "EduProof Admin Auth: <ts>:<METHOD>:<path>:<bodyHash>" issued within the
 * last 5 minutes. A bare wallet header is never accepted.
 */
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-admin-key'] as string;
  const validApiKey = process.env.ADMIN_API_KEY;

  if (validApiKey && apiKey && safeEqual(apiKey, validApiKey)) {
    return next();
  }

  const walletAddress = (req.headers['x-wallet-address'] as string || '').toLowerCase();
  const message = req.headers['x-message'] as string;
  const signature = req.headers['x-signature'] as string;
  const adminWallets = process.env.ADMIN_WALLETS?.split(',').map(w => w.trim().toLowerCase()).filter(Boolean) || [];

  const reject = (reason: string) => {
    logger.warn('Unauthorized admin access attempt', {
      wallet: walletAddress ? walletAddress.slice(0, 10) : undefined,
      url: req.url,
      method: req.method,
      reason,
    });
    return res.status(401).json({
      error: 'unauthorized',
      message: 'Admin access required. Provide a valid x-admin-key, or a signed wallet message (x-wallet-address + x-message + x-signature).',
    });
  };

  if (adminWallets.length === 0) {
    return reject('no admin wallets configured');
  }

  if (!walletAddress || !message || !signature) {
    return reject('missing wallet auth headers');
  }

  if (!adminWallets.includes(walletAddress)) {
    return reject('wallet not in allowlist');
  }

  if (typeof message !== 'string' || !message.startsWith(AUTH_MESSAGE_PREFIX)) {
    return reject('invalid message format');
  }

  const parts = message.slice(AUTH_MESSAGE_PREFIX.length).trim().split(':');
  if (parts.length !== 4) {
    return reject('invalid message structure');
  }

  const [timestampStr, method, path, bodyHash] = parts;
  const timestamp = Number(timestampStr);
  if (!Number.isFinite(timestamp) || String(Math.floor(timestamp)) !== timestampStr) {
    return reject('invalid message timestamp');
  }

  if (method !== req.method || path !== req.path) {
    return reject('message not bound to this request');
  }

  const expectedBodyHash = computeBodyHash(req.body);
  if (bodyHash !== expectedBodyHash) {
    return reject('message not bound to this request body');
  }

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > MAX_MESSAGE_AGE_SECONDS) {
    return reject('expired signature');
  }

  try {
    const recovered = await verifyMessage({
      address: walletAddress as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    });
    if (!recovered) {
      return reject('signature does not match wallet');
    }
  } catch (e) {
    const detail = e instanceof Error ? String(e.message) : String(e);
    logger.warn("Admin auth signature verification error", {
      wallet: walletAddress.slice(0, 10),
      error: detail,
    });
    return reject('invalid signature');
  }

  logger.debug('Admin wallet authenticated', { wallet: walletAddress.slice(0, 10) });
  return next();
}
