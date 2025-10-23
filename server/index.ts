import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import net from 'net';

// Load backend-specific environment variables FIRST
const envPath = path.resolve(process.cwd(), '.env.server');
console.log('🔧 Loading env from:', envPath);
try {
  const result = dotenv.config({ path: envPath });
  if (result.error) {
    console.error('❌ Error loading .env.server:', result.error);
  } else {
    console.log('✅ .env.server loaded successfully');
  }
} catch (envError) {
  console.error('❌ Fatal error loading .env.server:', envError);
}

// Global error handlers
process.on('unhandledRejection', (reason) => {
  console.error('🔴 [unhandledRejection]', reason);
});

process.on('uncaughtException', (error) => {
  console.error('🔴 [uncaughtException]', error);
});

const app = express();
const PORT = process.env.PORT || 3001;

// Check if port is already in use and exit gracefully
const tester = net.createServer();
tester.once('error', (err: any) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`⚠️  Port ${PORT} is already in use. Please stop the existing server first.`);
    console.log(`   Run: pkill -f "tsx server/index.ts" or use a different PORT`);
    process.exit(0);
  }
});
tester.once('listening', () => {
  tester.close();
});
tester.listen(PORT);

// Middleware
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'https://dd6a73f5-6622-48d5-bbc7-00e416f12c6e--preview.codenut.xyz',
    'https://preview-dd6a73f5-6622-48d5-bbc7-00e416f12c6e.codenut.dev'
  ],
  credentials: true
}));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Permissions Policy for clipboard access
app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'clipboard-write=(self)');
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'EduProof API Server Running' });
});

// Load routes dynamically after environment is configured
(async () => {
  try {
    console.log('📦 Loading route modules...');
    
    const healthRoutes = await import('./routes/health');
    const ipfsRoutes = await import('./routes/ipfs');
    const ipfsPreviewRoutes = await import('./routes/ipfsPreview');
    const ocrRoutes = await import('./routes/ocr');
    const certificatesRoutes = await import('./routes/certificates');
    const adminInstitutionsRoutes = await import('./routes/adminInstitutions');
    
    console.log('✅ All route modules loaded');

    // Routes
    app.use(healthRoutes.default);
    app.use(ipfsRoutes.default);
    app.use(ipfsPreviewRoutes.default);
    app.use(ocrRoutes.default);
    app.use(certificatesRoutes.default);
    app.use(adminInstitutionsRoutes.default);

    // Error handling middleware
    app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('🔴 [Express Error Handler]');
      console.error('Method:', req.method);
      console.error('URL:', req.url);
      console.error('Error type:', err?.constructor?.name);
      console.error('Error message:', err?.message);
      
      if (!res.headersSent) {
        res.status(err.status || 500).json({
          error: err.message || 'Internal Server Error',
          ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        });
      }
    });

    // Start server after routes are loaded
    const server = app.listen(PORT, () => {
      console.log(`🚀 EduProof API Server running on port ${PORT}`);
      console.log(`📡 CORS enabled for: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
      console.log(`🔑 Gemini API Key configured: ${process.env.GEMINI_API_KEY ? 'Yes' : 'No'}`);
      console.log(`📌 Pinata JWT configured: ${process.env.PINATA_JWT ? 'Yes' : 'No'}`);
      console.log(`📋 Server ready for requests`);
    });

    // Keep the process alive
    server.on('error', (error: any) => {
      console.error('🔴 Server error:', error);
      process.exit(1);
    });
  } catch (error: any) {
    console.error('❌❌❌ FATAL ERROR LOADING ROUTES ❌❌❌');
    console.error('Error type:', error?.constructor?.name);
    console.error('Error message:', error?.message);
    console.error('Error stack:', error?.stack);
    process.exit(1);
  }
})();
