import { Router, Request, Response, NextFunction } from 'express';
import { getSupabaseClient, checkDbConnection } from '../services/supabase';
import { logger } from '../utils/logger';

const router = Router();

router.get('/api/health', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Test Supabase connection with dedicated function
    const dbCheck = await checkDbConnection();
    const supabaseClient = getSupabaseClient();
    
    const dbStatus = !supabaseClient 
      ? 'not_configured' 
      : dbCheck.connected 
        ? 'connected' 
        : 'error';

    res.json({
      ok: true,
      timestamp: new Date().toISOString(),
      node_env: process.env.NODE_ENV || 'development',
      services: {
        gemini: {
          configured: !!process.env.GEMINI_API_KEY,
          model: process.env.GEMINI_MODEL || 'gemini-1.5-flash-latest',
        },
        pinata: {
          configured: !!process.env.PINATA_JWT,
        },
        supabase: {
          configured: !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE),
          status: dbStatus,
          db_rows_sample: dbCheck.rows,
          ...(dbCheck.error && { error: dbCheck.error }),
        },
      },
      limits: {
        max_upload_mb: parseInt(process.env.MAX_UPLOAD_MB || '15'),
        gemini_timeout_ms: parseInt(process.env.GEMINI_TIMEOUT_MS || '30000'),
      },
    });
  } catch (error) {
    logger.error('Health check error', { error: error instanceof Error ? error.message : String(error) });
    next(error);
  }
});

export default router;
