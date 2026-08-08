import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { logger } from '../utils/logger';

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
    'gemini-1.5-flash-latest',
    'gemini-1.5-flash-002',
    'gemini-1.5-pro-latest'
  ].filter(Boolean) as string[];
  return candidates.find(m => !/flash-image/i.test(m))!;
}

router.post('/api/ocr', upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    logger.info('OCR Request started');
    logger.debug('File present', { hasFile: req.file ? 'Yes' : 'No' });

    if (!req.file) {
      return res.status(400).json({ error: 'Missing file (field "file")' });
    }

    logger.info('File details', {
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

    logger.debug('Using model', { model: MODEL });

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
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
      logger.debug('Calling Gemini API', { model });

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TIMEOUT);

      try {
        const r = await fetch(url, {
          method: 'POST',
          // The API key rides in a header, not the URL: query strings are
          // the most commonly logged part of a request across proxies.
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': API_KEY },
          body: JSON.stringify(body),
          signal: controller.signal
        });

        const txt = await r.text();
        logger.debug('Gemini response status', { status: r.status });

        if (!r.ok) {
          let details: unknown;
          try {
            details = JSON.parse(txt);
          } catch {
            details = txt;
          }
          logger.error('Gemini API error', { error: details });
          return { ok: false, status: r.status, details };
        }

        return { ok: true, txt };
      } finally {
        clearTimeout(timeout);
      }
    }

    const tryModels = [MODEL, 'gemini-1.5-flash-002', 'gemini-1.5-pro-latest'];
    let resp: { ok: boolean; txt?: string; status?: number; details?: unknown } = { ok: false };

    for (const m of tryModels) {
      resp = await callGemini(m);
      if (resp.ok) {
        logger.debug('Successfully used model', { model: m });
        break;
      }

      const msg = JSON.stringify(resp.details || {});
      if (!/model|unsupported|image/i.test(msg)) {
        logger.error('Non-model error, stopping fallback', { error: msg });
        break;
      }
      logger.debug('Model failed, trying next fallback');
    }

    if (!resp.ok) {
      const s = resp.status === 400 ? 502 : resp.status || 500;
      return res.status(s).json({
        error: 'Gemini HTTP error',
        details: resp.status || 'UPSTREAM_ERROR'
      });
    }

    const txt: string = resp.txt ?? '';
    logger.debug('Gemini raw response received', { length: txt.substring(0, 500) });

    let out: {
      verification_url?: string;
      certificate_id?: string;
      institution?: string;
      fields_confidence?: Record<string, number>;
    } = {};
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

    const { inferVerificationUrl, extractUrlFromText } = await import('../utils/verificationSources.js');

    let verificationUrl = out?.verification_url && out.verification_url.length > 0 ? out.verification_url : undefined;

    if (!verificationUrl && txt) {
      const extracted = extractUrlFromText(txt);
      if (extracted) {
        logger.debug('Extracted URL via regex', { url: extracted });
        verificationUrl = extracted;
      }
    }

    if (!verificationUrl) {
      const certId = out?.certificate_id || undefined;
      const inferred = inferVerificationUrl(out?.institution || '', certId);
      if (inferred) {
        logger.debug('Inferred URL via institution mapping', { url: inferred });
        verificationUrl = inferred;
      }
    }

    const fc = out?.fields_confidence || {};
    const score = (
      ['student_name', 'course_name', 'institution', 'issue_date']
        .map(k => Number(fc[k] ?? 0))
        .reduce((a, b) => a + b, 0) / 4
    ) * 100;

    logger.info('OCR completed', {
      score: Math.round(score),
      hasVerificationUrl: !!verificationUrl
    });

    return res.json({
      ...out,
      verification_url: verificationUrl || '',
      verification_score: Math.round(score)
    });

  } catch (error) {
    const e = error as Error & { details?: unknown };
    logger.error('OCR error', {
      errorType: e?.constructor?.name,
      errorMessage: e?.message,
      stack: e?.stack,
      details: e.details
    });

    next(error);
  }
});

export default router;
