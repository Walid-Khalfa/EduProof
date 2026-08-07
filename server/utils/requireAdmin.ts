import { Request, Response, NextFunction } from 'express';
import { verifyMessage } from 'viem';
import { logger } from '../utils/logger';

const AUTH_MESSAGE_PREFIX = 'EduProof Admin Auth:';
const MAX_MESSAGE_AGE_SECONDS = 5 * 60;

/**
 * Builds the message an admin wallet must sign to authenticate.
 * The timestamp makes the signature short-lived and prevents replay.
 */
export function buildAdminAuthMessage(nowSeconds = Math.floor(Date.now() / 1000)): string {
  return `${AUTH_MESSAGE_PREFIX} ${nowSeconds}`;
}

/**
 * Middleware to require admin authentication.
 * Requires either:
 * 1. Admin API key (ADMIN_API_KEY env var via x-admin-key header)
 * 2. Wallet allowlist (ADMIN_WALLETS env var) with a fresh EIP-191 signature
 *    proving ownership of the wallet (x-wallet-address + x-message + x-signature).
 *
 * The wallet path requires a signature of the exact message "EduProof Admin Auth: <unixSeconds>"
 * issued within the last 5 minutes. A bare wallet header is never accepted.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-admin-key'] as string;
  const validApiKey = process.env.ADMIN_API_KEY;

  if (validApiKey && apiKey && apiKey === validApiKey) {
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

  const timestamp = Number(message.slice(AUTH_MESSAGE_PREFIX.length).trim());
  if (!Number.isFinite(timestamp) || String(Math.floor(timestamp)) !== message.slice(AUTH_MESSAGE_PREFIX.length).trim()) {
    return reject('invalid message timestamp');
  }

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > MAX_MESSAGE_AGE_SECONDS) {
    return reject('expired signature');
  }

  try {
    const recovered = verifyMessage({
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
