import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import net from 'net';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { logger } from './utils/logger';

const isProduction = process.env.NODE_ENV === 'production';

// Load backend-specific environment variables FIRST
const envPath = path.resolve(process.cwd(), '.env.server');
logger.info('Loading environment from:', envPath);
try {
  const result = dotenv.config({ path: envPath });
  if (result.error) {
    logger.error('Error loading .env.server:', result.error);
  } else {
    logger.info('.env.server loaded successfully');
  }
} catch (envError) {
  logger.error('Fatal error loading .env.server:', envError);
}

// Validate required environment variables at startup
const requiredEnv = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE', 'GEMINI_API_KEY', 'PINATA_JWT', 'RPC_URL', 'CERTIFICATE_CONTRACT'];
const missingEnv = requiredEnv.filter(key => !process.env[key]);
if (missingEnv.length > 0) {
  missingEnv.forEach(key => logger.error(`Missing required env var: ${key}`));
  logger.error('Startup validation failed. Missing:', missingEnv.join(', '));
  if (isProduction) {
    process.exit(1);
  }
}

// Global error handlers
process.on('unhandledRejection', (reason) => {
  logger.error('unhandledRejection', reason);
});

process.on('uncaughtException', (error) => {
  logger.fatal('uncaughtException', error);
  if (isProduction) {
    process.exit(1);
  }
});

const app = express();
const PORT = process.env.PORT || 3001;

// Check if port is already in use and exit gracefully
const tester = net.createServer();
tester.once('error', (err: any) => {
  if (err.code === 'EADDRINUSE') {
    logger.warn(`Port ${PORT} is already in use. Please stop the existing server first.`);
    process.exit(0);
  }
});
tester.once('listening', () => {
  tester.close();
});
tester.listen(PORT);

// Security headers via Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:", "ipfs://", "https://*.ipfs.io", "https://gateway.pinata.cloud"],
      connectSrc: ["'self'", "https:", "wss:"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "same-origin" },
  crossOriginEmbedderPolicy: false,
}));

// CORS — dynamic origin based on FRONTEND_URL
const corsOrigins = [process.env.FRONTEND_URL || 'http://localhost:5173'];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (corsOrigins.includes(origin)) return callback(null, true);
    logger.warn(`CORS blocked origin: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Rate limiter for general API routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProduction ? 100 : 1000, // 100 requests per window in prod
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);

// Stricter rate limiter for OCR (expensive Gemini calls)
const ocrLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isProduction ? 20 : 200, // 20 OCR calls per hour in prod
  message: 'OCR rate limit exceeded. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/ocr', ocrLimiter);

// Permissions Policy for clipboard access
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Permissions-Policy', 'clipboard-write=(self)');
  next();
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'EduProof API Server Running' });
});

// Load routes dynamically after environment is configured
(async () => {
  try {
    logger.info('Loading route modules...');

    const healthRoutes = await import('./routes/health');
    const ipfsRoutes = await import('./routes/ipfs');
    const ipfsPreviewRoutes = await import('./routes/ipfsPreview');
    const ocrRoutes = await import('./routes/ocr');
    const certificatesRoutes = await import('./routes/certificates');
    const adminInstitutionsRoutes = await import('./routes/adminInstitutions');

    logger.info('All route modules loaded');

    // Routes
    app.use(healthRoutes.default);
    app.use(ipfsRoutes.default);
    app.use(ipfsPreviewRoutes.default);
    app.use(ocrRoutes.default);
    app.use(certificatesRoutes.default);
    app.use(adminInstitutionsRoutes.default);

    // Error handling middleware
    app.use((err: any, req: Request, res: Response, next: NextFunction) => {
      logger.error('Express Error Handler', {
        method: req.method,
        url: req.url,
        errorType: err?.constructor?.name,
        errorMessage: err?.message,
        stack: err?.stack,
      });

      if (!res.headersSent) {
        const status = typeof err.status === 'number' ? err.status : 500;
        res.status(status).json({
          error: isProduction ? 'Internal Server Error' : err.message,
          ...(isProduction ? {} : { stack: err.stack }),
        });
      }
    });

    // Start server after routes are loaded
    const server = app.listen(PORT, () => {
      logger.info(`EduProof API Server running on port ${PORT}`);
      logger.info(`CORS enabled for: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
      logger.info(`Gemini API Key configured: ${process.env.GEMINI_API_KEY ? 'Yes' : 'No'}`);
      logger.info(`Pinata JWT configured: ${process.env.PINATA_JWT ? 'Yes' : 'No'}`);
      logger.info('Server ready for requests');
    });

    // Keep the process alive
    server.on('error', (error: any) => {
      logger.error('Server error:', error);
      process.exit(1);
    });
  } catch (error: any) {
    logger.fatal('FATAL ERROR LOADING ROUTES', {
      errorType: error?.constructor?.name,
      errorMessage: error?.message,
      stack: error?.stack,
    });
    process.exit(1);
  }
})();
