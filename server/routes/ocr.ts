import { Router, Request, Response } from 'express';
import multer from 'multer';

const router = Router();
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: Number(process.env.MAX_UPLOAD_MB || 15) * 1024 * 1024 }
});

const ALLOWED_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/svg+xml',
  'application/pdf'
]);

const need = (name: string) => {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
};

function pickVisionModel(input?: string) {
  const candidates = [
    input,
    'gemini-1.5-flash-latest',   // latest stable flash multimodal
    'gemini-1.5-flash-002',       // specific stable version
    'gemini-1.5-pro-latest'       // pro fallback
  ].filter(Boolean) as string[];
  // Exclude image generation models that aren't for OCR
  return candidates.find(m => !/flash-image/i.test(m))!;
}

router.post('/api/ocr', upload.single('file'), async (req: Request, res: Response) => {
  try {
    console.log('=== OCR Request Started ===');
    console.log('File present:', req.file ? 'Yes' : 'No');
    
    if (!req.file) {
      return res.status(400).json({ error: 'Missing file (field "file")' });
    }

    console.log('File details:', {
      mimetype: req.file.mimetype,
      size: req.file.size,
      originalname: req.file.originalname
    });

    if (!ALLOWED_TYPES.has(req.file.mimetype)) {
      return res.status(415).json({ error: `Unsupported type: ${req.file.mimetype}` });
    }

    const API_KEY = need('GEMINI_API_KEY');
    const REQ_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash-latest';
    const MODEL = pickVisionModel(REQ_MODEL);
    const TIMEOUT = Number(process.env.GEMINI_TIMEOUT_MS || 30000);

    console.log('Using model:', MODEL);

    const base64 = req.file.buffer.toString('base64');

    const system = `You are an OCR & information extraction assistant for academic certificates.
Return STRICT JSON ONLY with this exact schema:
{
  "student_name": string,
  "course_name": string,
  "institution": string,
  "issue_date": string,
  "certificate_id": string,
  "fields_confidence": {
    "student_name": number,
    "course_name": number,
    "institution": number,
    "issue_date": number
  },
  "verification_notes": string,
  "verification_url": string
}

Rules:
- If the certificate shows a canonical verification URL (e.g., coursera.org/.../verify/<id>, credentials.edx.org/...), fill "verification_url".
- Extract "certificate_id" if visible (credential ID, certificate number, etc.).
- Do NOT invent URLs. If uncertain, leave "verification_url" empty.
- Output MUST be valid JSON. No markdown, no commentary.`;

    const user = `Extract fields from the image. If missing, use "" and confidence 0.0. Prefer YYYY-MM-DD for the date. Look for verification URLs and certificate IDs.`;

    const body = {
      contents: [{
        role: 'user',
        parts: [
          { text: `${system}\n\n${user}` },
          { 
            inlineData: { 
              mimeType: req.file.mimetype, 
              data: base64 
            } 
          }
        ]
      }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json'
      }
    };

    async function callGemini(model: string) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(API_KEY)}`;
      console.log('Calling Gemini API with model:', model);
      
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TIMEOUT);
      
      try {
        const r = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal
        });
        
        const txt = await r.text();
        console.log('Gemini response status:', r.status);
        
        if (!r.ok) {
          let details: any;
          try { 
            details = JSON.parse(txt); 
          } catch { 
            details = txt; 
          }
          console.error('Gemini API error:', details);
          return { ok: false, status: r.status, details };
        }
        
        return { ok: true, txt };
      } finally {
        clearTimeout(timeout);
      }
    }

    // Try configured model, then fallbacks
    const tryModels = [MODEL, 'gemini-1.5-flash-002', 'gemini-1.5-pro-latest'];
    let resp: any;
    
    for (const m of tryModels) {
      resp = await callGemini(m);
      if (resp.ok) { 
        console.log('Successfully used model:', m);
        break; 
      }
      
      // If error indicates model issue, try next
      const msg = JSON.stringify(resp.details || {});
      if (!/model|unsupported|image/i.test(msg)) {
        console.error('Non-model error, stopping fallback:', msg);
        break;
      }
      console.log('Model failed, trying next fallback...');
    }

    if (!resp.ok) {
      const s = resp.status === 400 ? 502 : resp.status || 500;
      return res.status(s).json({ 
        error: 'Gemini HTTP error', 
        details: resp.details 
      });
    }

    const txt: string = resp.txt;
    console.log('Gemini raw response (first 500 chars):', txt.substring(0, 500));

    let out: any;
    try {
      const json = JSON.parse(txt);
      const raw = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      
      if (!raw) {
        return res.status(502).json({ 
          error: 'Empty Gemini content', 
          raw: json 
        });
      }

      try { 
        out = JSON.parse(raw); 
      } catch {
        // Fallback: extract JSON from text
        const i = raw.indexOf('{');
        const j = raw.lastIndexOf('}');
        
        if (i === -1 || j === -1) {
          return res.status(502).json({ 
            error: 'Gemini did not return JSON', 
            raw 
          });
        }
        
        out = JSON.parse(raw.slice(i, j + 1));
      }
    } catch {
      try { 
        out = JSON.parse(txt); 
      } catch { 
        return res.status(502).json({ 
          error: 'Unparseable Gemini response', 
          raw: txt 
        }); 
      }
    }

    // Import verification utilities
    const { inferVerificationUrl, extractUrlFromText } = await import('../utils/verificationSources.js');

    // Extract verification URL using 3-tier strategy
    let verificationUrl = out?.verification_url && out.verification_url.length > 0 ? out.verification_url : undefined;

    // Tier 1: Already extracted from OCR JSON (handled above)
    
    // Tier 2: Regex fallback - extract from raw OCR text if available
    if (!verificationUrl && txt) {
      const extracted = extractUrlFromText(txt);
      if (extracted) {
        console.log('Extracted URL via regex:', extracted);
        verificationUrl = extracted;
      }
    }

    // Tier 3: Institution mapping with certificate ID
    if (!verificationUrl) {
      const certId = out?.certificate_id || undefined;
      const inferred = inferVerificationUrl(out?.institution || '', certId);
      if (inferred) {
        console.log('Inferred URL via institution mapping:', inferred);
        verificationUrl = inferred;
      }
    }

    // Calculate confidence score
    const fc = out?.fields_confidence || {};
    const score = (
      ['student_name', 'course_name', 'institution', 'issue_date']
        .map(k => Number(fc[k] ?? 0))
        .reduce((a, b) => a + b, 0) / 4
    ) * 100;

    console.log('OCR completed successfully, score:', Math.round(score));
    console.log('Verification URL:', verificationUrl || 'none');
    console.log('=== OCR Request Completed ===');

    return res.json({ 
      ...out,
      verification_url: verificationUrl || '',
      verification_score: Math.round(score) 
    });

  } catch (error: any) {
    console.error('=== OCR ERROR ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    if (error.details) {
      console.error('Error details:', JSON.stringify(error.details, null, 2));
    }
    console.error('=== END OCR ERROR ===');
    
    return res.status(500).json({ 
      error: String(error?.message || error),
      ...(error.details && { details: error.details })
    });
  }
});

export default router;
