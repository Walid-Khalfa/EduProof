import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Middleware to require admin authentication.
 * Requires either:
 * 1. Admin API key (ADMIN_API_KEY env var via x-admin-key header)
 * 2. Admin wallet allowlist (ADMIN_WALLETS env var via x-wallet-address header)
 *
 * In production, ADMIN_API_KEY must be configured.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-admin-key'] as string;
  const validApiKey = process.env.ADMIN_API_KEY;

  if (validApiKey && apiKey && apiKey === validApiKey) {
    return next();
  }

  const walletAddress = req.headers['x-wallet-address'] as string;
  const adminWallets = process.env.ADMIN_WALLETS?.split(',').map(w => w.trim().toLowerCase()) || [];

  if (walletAddress && adminWallets.length > 0 && adminWallets.includes(walletAddress.toLowerCase())) {
    return next();
  }

  logger.warn('Unauthorized admin access attempt', {
    wallet: walletAddress?.substring(0, 10),
    url: req.url,
    method: req.method,
  });

  return res.status(401).json({
    error: 'unauthorized',
    message: 'Admin access required. Provide valid x-admin-key or x-wallet-address header.',
  });
}
