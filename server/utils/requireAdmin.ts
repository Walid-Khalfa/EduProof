import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to require admin authentication
 * Supports two methods:
 * 1. Admin wallet allowlist (ADMIN_WALLETS env var)
 * 2. Admin API key (ADMIN_API_KEY env var via x-admin-key header)
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  // Method 1: Check x-admin-key header
  const apiKey = req.headers['x-admin-key'] as string;
  const validApiKey = process.env.ADMIN_API_KEY;

  if (validApiKey && apiKey === validApiKey) {
    return next();
  }

  // Method 2: Check wallet address allowlist
  const walletAddress = req.headers['x-wallet-address'] as string;
  const adminWallets = process.env.ADMIN_WALLETS?.split(',').map(w => w.trim().toLowerCase()) || [];

  if (walletAddress && adminWallets.includes(walletAddress.toLowerCase())) {
    return next();
  }

  // No valid authentication found
  return res.status(401).json({
    error: 'unauthorized',
    message: 'Admin access required. Provide valid x-admin-key or x-wallet-address header.'
  });
}
