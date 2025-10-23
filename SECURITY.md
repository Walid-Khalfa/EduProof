# Security Best Practices

This document outlines security considerations and best practices for the EduProof platform.

---

## Environment Variable Separation

### Frontend Environment (`.env`)

**Public variables only** - These are exposed to the browser:

```bash
# Blockchain Configuration
VITE_CHAIN=sepolia
VITE_WALLETCONNECT_PROJECT_ID=ac9166dd615752bda362b92887c6a1ad

# Contract Addresses
VITE_CERTIFICATE_CONTRACT=0x742d35Cc6634C0532925a3b844Bc9e7595f0bfbE
VITE_REGISTRY_CONTRACT=0x09635F643e140090A9A8Dcd712eD6285858ceBef

# Backend API
VITE_API_URL=http://localhost:3001

# Supabase (Public keys only)
VITE_SUPABASE_URL=https://fdlyaiiqqtkvxoxbllwa.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

**CRITICAL:** Never put secrets in `.env`:
- ❌ No API keys (Gemini, Pinata)
- ❌ No service role keys
- ❌ No admin credentials
- ❌ No private keys

### Backend Environment (`.env.server`)

**Server-side secrets only** - Never exposed to browser:

```bash
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://your-domain.com

# Gemini AI (Server-side only)
GEMINI_API_KEY=<your-secret-key>
GEMINI_MODEL=gemini-flash-latest
GEMINI_TIMEOUT_MS=30000
MAX_UPLOAD_MB=15

# Pinata IPFS (Server-side only)
PINATA_JWT=<your-jwt-token>
PINATA_API_KEY=<your-api-key>
PINATA_SECRET_KEY=<your-secret-key>

# Supabase (Server-side only)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE=<your-service-role-key>

# Admin Authentication (Server-side only)
ADMIN_API_KEY=<generate-secure-uuid>
ADMIN_WALLETS=0x123...,0xabc...
```

**CRITICAL:** Protect `.env.server`:
- ✅ Add to `.gitignore`
- ✅ Use strong, randomly generated keys
- ✅ Rotate credentials periodically
- ✅ Never commit to version control
- ✅ Use environment-specific values (dev/staging/prod)

---

## Service Role Key Protection

### Supabase Service Role

The `SUPABASE_SERVICE_ROLE` key **bypasses Row Level Security (RLS)** and has full database access.

**Security Rules:**

1. **Server-side only**
   - Never expose to frontend
   - Only use in backend API routes
   - Never log or display in responses

2. **Minimal usage**
   - Use only when RLS bypass is required
   - Prefer anon key + RLS for user-facing operations
   - Audit all service_role usage

3. **Access control**
   - Restrict to specific backend routes
   - Implement additional authorization checks
   - Log all service_role operations

**Example - Secure Usage:**

```typescript
// ✅ CORRECT - Server-side only
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!, // Server-side only
  { auth: { persistSession: false } }
);

// ❌ WRONG - Never in frontend
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_SERVICE_ROLE // NEVER DO THIS
);
```

---

## Anti-Duplicate Mechanisms

### Certificate ID Uniqueness

**Database Constraint:**
```sql
CREATE UNIQUE INDEX idx_certificates_cert_id 
ON certificates(cert_id);
```

**Pre-mint Check:**
```typescript
// Frontend checks before minting
const { available } = await fetch(
  `/api/certificates/availability?certId=${certId}`
).then(r => r.json());

if (!available) {
  throw new Error('Certificate ID already exists');
}
```

**Idempotency Key:**
```typescript
// Backend prevents duplicate indexing
const idempotencyKey = sha256(
  `${fileCid}-${ownerAddress}-${Date.now()}`
);

await fetch('/api/certificates/index', {
  method: 'POST',
  headers: {
    'x-idempotency-key': idempotencyKey
  },
  body: JSON.stringify(certificateData)
});
```

**Database-level Protection:**
```typescript
// Backend handles conflicts gracefully
try {
  await supabase.from('certificates').insert(data);
} catch (error) {
  if (error.code === '23505') { // Unique violation
    return res.status(409).json({ 
      error: 'Certificate already exists' 
    });
  }
  throw error;
}
```

---

## Benign Console Errors

### WalletConnect Telemetry (400 Error)

**Error Message:**
```
Failed to load resource: the server responded with a status of 400 ()
https://pulse.walletconnect.org/e?projectId=...
```

**Explanation:**
- WalletConnect sends anonymous usage telemetry
- External analytics service (not critical)
- Does not affect wallet functionality
- Safe to ignore

**Impact:** None - wallet connection works normally

---

### HEAD Request Aborted

**Error Message:**
```
HEAD https://preview-xxx.codenut.dev/ net::ERR_ABORTED
```

**Explanation:**
- Browser preflight check for CORS
- Normal browser behavior
- Request is intentionally aborted after headers received
- Not an actual error

**Impact:** None - preview loading works correctly

---

### Lit Dev Mode Warning

**Warning Message:**
```
Lit is in dev mode. Not recommended for production!
```

**Explanation:**
- Development build of Lit library (used by RainbowKit)
- Only appears in development environment
- Automatically removed in production builds
- No security or performance impact in dev

**Impact:** None - informational only

---

## Input Validation

### File Upload Validation

**Server-side checks:**

```typescript
// 1. File type validation
const ALLOWED_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'application/pdf'
]);

if (!ALLOWED_TYPES.has(req.file.mimetype)) {
  return res.status(415).json({ 
    error: `Unsupported type: ${req.file.mimetype}` 
  });
}

// 2. File size validation
const MAX_SIZE = Number(process.env.MAX_UPLOAD_MB || 15) * 1024 * 1024;

if (req.file.size > MAX_SIZE) {
  return res.status(413).json({ 
    error: `File too large (max ${MAX_SIZE / 1024 / 1024}MB)` 
  });
}

// 3. Content validation (for images)
const buffer = req.file.buffer;
// Validate image headers, dimensions, etc.
```

**Frontend validation:**

```typescript
// Pre-upload checks
const MAX_SIZE = 15 * 1024 * 1024; // 15MB

if (file.size > MAX_SIZE) {
  toast.error('File too large (max 15MB)');
  return;
}

const allowedTypes = ['image/png', 'image/jpeg', 'application/pdf'];
if (!allowedTypes.includes(file.type)) {
  toast.error('Unsupported file type');
  return;
}
```

---

### Ethereum Address Validation

**Server-side:**

```typescript
import { isAddress } from 'viem';

if (!isAddress(ownerAddress)) {
  return res.status(400).json({ 
    error: 'Invalid Ethereum address' 
  });
}

// Normalize to checksum format
const normalizedAddress = ownerAddress.toLowerCase();
```

**Frontend:**

```typescript
import { isAddress } from 'viem';

if (!isAddress(address)) {
  toast.error('Invalid wallet address');
  return;
}
```

---

### SQL Injection Prevention

**Supabase automatically prevents SQL injection** via parameterized queries:

```typescript
// ✅ SAFE - Parameterized query
const { data } = await supabase
  .from('certificates')
  .select('*')
  .eq('cert_id', userInput);

// ❌ DANGEROUS - Never use raw SQL with user input
const { data } = await supabase.rpc('raw_query', {
  query: `SELECT * FROM certificates WHERE cert_id = '${userInput}'`
});
```

---

## CORS Configuration

### Backend CORS Setup

```typescript
import cors from 'cors';

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173', // Development
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-admin-key', 'x-idempotency-key']
}));
```

**Security Benefits:**
- Prevents unauthorized cross-origin requests
- Protects admin endpoints from CSRF
- Allows legitimate frontend access

---

## Admin Authentication

### Admin API Key

**Generation:**
```bash
# Generate secure UUID
uuidgen
# or
node -e "console.log(require('crypto').randomUUID())"
```

**Usage:**
```typescript
// Backend middleware
function requireAdmin(req, res, next) {
  const providedKey = req.headers['x-admin-key'];
  const validKey = process.env.ADMIN_API_KEY;
  
  if (!providedKey || providedKey !== validKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  next();
}

// Apply to admin routes
app.use('/api/admin/*', requireAdmin);
```

**Best Practices:**
- Use strong, randomly generated keys
- Rotate periodically (every 90 days)
- Never commit to version control
- Use HTTPS in production
- Implement rate limiting
- Log all admin actions

---

## Rate Limiting

### Recommended Implementation

```typescript
import rateLimit from 'express-rate-limit';

// OCR endpoint (expensive operation)
const ocrLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: 'Too many OCR requests, please try again later'
});

app.post('/api/ocr', ocrLimiter, ocrHandler);

// Admin endpoints
const adminLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: 'Too many admin requests'
});

app.use('/api/admin/*', adminLimiter);
```

---

## HTTPS in Production

### SSL/TLS Configuration

**Requirements:**
- Use HTTPS for all production traffic
- Redirect HTTP to HTTPS
- Use valid SSL certificates (Let's Encrypt, etc.)
- Enable HSTS headers

**Example (Express):**
```typescript
// Redirect HTTP to HTTPS
app.use((req, res, next) => {
  if (req.header('x-forwarded-proto') !== 'https') {
    res.redirect(`https://${req.header('host')}${req.url}`);
  } else {
    next();
  }
});

// HSTS header
app.use((req, res, next) => {
  res.setHeader(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains'
  );
  next();
});
```

---

## Secrets Management

### Development

**Use `.env` files:**
- `.env` - Frontend public variables
- `.env.server` - Backend secrets
- `.env.example` - Template (no secrets)

**Add to `.gitignore`:**
```
.env
.env.server
.env.local
.env.*.local
```

### Production

**Use environment variables:**
- Vercel: Environment Variables dashboard
- AWS: Systems Manager Parameter Store
- Docker: Docker secrets or env files
- Kubernetes: Secrets objects

**Never:**
- Commit secrets to git
- Log secrets in console
- Display secrets in error messages
- Send secrets to frontend

---

## Audit Logging

### Recommended Logging

```typescript
// Log admin actions
function logAdminAction(action: string, details: any) {
  console.log({
    timestamp: new Date().toISOString(),
    action,
    details,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });
  
  // Also store in database for audit trail
  await supabase.from('admin_logs').insert({
    action,
    details,
    ip: req.ip,
    created_at: new Date()
  });
}

// Usage
app.post('/api/admin/institutions/:id/approve', async (req, res) => {
  // ... approve logic ...
  
  await logAdminAction('institution_approved', {
    institutionId: req.params.id,
    institutionName: institution.name
  });
});
```

---

## Security Checklist

### Pre-deployment

- [ ] All secrets in `.env.server` (not `.env`)
- [ ] `.env.server` in `.gitignore`
- [ ] Service role key never exposed to frontend
- [ ] Admin API key is strong UUID
- [ ] CORS configured for production domain
- [ ] HTTPS enabled and enforced
- [ ] Rate limiting implemented
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention verified
- [ ] File upload limits enforced
- [ ] Error messages don't leak sensitive info
- [ ] Audit logging enabled for admin actions

### Post-deployment

- [ ] Monitor logs for suspicious activity
- [ ] Rotate credentials every 90 days
- [ ] Review admin access logs monthly
- [ ] Test security with penetration testing
- [ ] Keep dependencies updated
- [ ] Monitor for CVEs in dependencies

---

## Incident Response

### If Secrets Are Compromised

1. **Immediate Actions:**
   - Rotate all affected credentials
   - Revoke compromised API keys
   - Review access logs for unauthorized usage
   - Notify affected users if data breach occurred

2. **Investigation:**
   - Identify how secrets were exposed
   - Check git history for committed secrets
   - Review server logs for unauthorized access
   - Assess scope of potential damage

3. **Prevention:**
   - Update security practices
   - Implement additional monitoring
   - Train team on security best practices
   - Consider secrets management service

---

## Contact

For security issues, contact: security@eduproof.example

**Do not** disclose security vulnerabilities publicly.
