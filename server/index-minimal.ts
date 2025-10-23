import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

console.log('🚀 Starting minimal server...');

// Load env
const envPath = path.resolve(process.cwd(), '.env.server');
dotenv.config({ path: envPath });

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Simple health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Minimal server running' });
});

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    timestamp: new Date().toISOString(),
    env_loaded: {
      gemini: !!process.env.GEMINI_API_KEY,
      pinata: !!process.env.PINATA_JWT,
      supabase: !!process.env.SUPABASE_URL
    }
  });
});

app.listen(PORT, () => {
  console.log(`✅ Minimal server running on port ${PORT}`);
});
