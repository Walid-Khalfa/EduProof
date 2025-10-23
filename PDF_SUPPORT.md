# PDF Certificate Support

EduProof now supports **PDF certificates** in addition to images (PNG, JPG, SVG). This document explains the implementation and usage.

---

## Features

✅ **PDF Upload & Processing**
- Accept PDF files up to 15MB
- Server-side preview generation (first page → PNG)
- Multi-page PDF support with page count tracking

✅ **OCR with Gemini AI**
- Direct PDF processing with `gemini-flash-latest`
- Automatic field extraction (student, course, institution, date)
- Confidence scoring and verification

✅ **IPFS Storage**
- Original PDF uploaded to IPFS
- Generated PNG preview uploaded separately
- Both CIDs stored in database

✅ **Blockchain Minting**
- NFT metadata uses preview image for display
- PDF metadata included in attributes
- Full anti-duplicate protection maintained

✅ **Database Schema**
- `media_mime`: MIME type (application/pdf, image/png, etc.)
- `media_pages`: Number of pages (for PDFs)
- `preview_cid`: IPFS CID of generated preview
- `ocr_text`: Optional raw OCR text (JSONB)

---

## Technical Implementation

### Backend

#### 1. IPFS Preview Proxy (`server/routes/ipfsPreview.ts`)

**Purpose:** Serve PDF SVG previews with correct `Content-Type` and multi-gateway fallback.

**Routes:**
- `GET /api/ipfs/preview/:cid.svg` - Proxy SVG preview with proper headers
- `GET /api/ipfs/preview/:cid.debug` - Diagnostic endpoint for troubleshooting

**Features:**
✅ **Multi-Gateway Fallback**
- Tries gateways in order: Pinata → Cloudflare → IPFS.io
- HEAD request first to validate content-type
- Falls back to next gateway on failure
- 4-second timeout per gateway

✅ **Strict CID Validation**
- Regex: `^(Qm|baf)[A-Za-z0-9]+$`
- Returns 400 for invalid CIDs

✅ **Content Validation**
- Checks `Content-Type: image/svg+xml`
- Validates response starts with `<svg`
- Rejects non-SVG responses

✅ **Structured Logging**
```
[ipfs.preview] cid=QmXxx
[ipfs.preview.try] url=https://... status=200 type=image/svg+xml time=123ms
[ipfs.preview.ok] url=https://... bytes=1234 time=456ms
[ipfs.preview.err] url=https://... message="timeout"
```

✅ **Caching Headers**
```
Content-Type: image/svg+xml; charset=utf-8
Cache-Control: public, max-age=300, s-maxage=300, stale-while-revalidate=60
X-IPFS-Gateway: https://gateway.pinata.cloud
X-Response-Time: 123ms
```

**Debug Endpoint Response:**
```json
{
  "cid": "QmXxx",
  "finalUrl": "https://gateway.pinata.cloud/ipfs/QmXxx",
  "status": 200,
  "contentType": "image/svg+xml",
  "bytes": 1234,
  "gatewaysTried": [
    {"url": "https://gateway.pinata.cloud/ipfs/QmXxx", "headStatus": 200, "headType": "image/svg+xml", "durationMs": 123},
    {"url": "https://cloudflare-ipfs.com/ipfs/QmXxx", "error": "timeout"}
  ],
  "sample": "<svg xmlns=\"http://www.w3.org/2000/svg\" ... (first 200 chars)",
  "durationMs": 456
}
```

**Error Responses:**
- `400` - Invalid CID format
- `502` - All gateways failed (includes `gatewaysTried` details)
- `500` - Internal server error

#### 2. PDF Preview Generation (`server/utils/pdfPreview.ts`)
```typescript
import * as pdfjsLib from 'pdfjs-dist';
import { createCanvas } from 'canvas';

export async function generatePdfPreview(
  pdfBuffer: Buffer,
  scale: number = 2
): Promise<PdfPreviewResult>
```

- Uses `pdfjs-dist` to parse PDF
- Renders first page to canvas at 2x scale (high quality)
- Returns PNG buffer + metadata (page count, dimensions)

#### 3. Upload Endpoint (`POST /api/ipfs/upload-media`)
```typescript
// Accepts: image/png, image/jpeg, image/svg+xml, application/pdf
// Returns:
{
  ok: true,
  cid: "Qm...",           // Original file CID
  url: "https://...",     // Gateway URL
  previewCid: "Qm...",    // Preview CID (PDF only)
  previewUrl: "https://...", // Preview URL (PDF only)
  mime: "application/pdf",
  pages: 3,               // Page count (PDF only)
  sha256: "abc123...",    // File hash
  width: 1200,            // Preview dimensions
  height: 1600
}
```

**Process:**
1. Validate file type and size
2. If PDF: generate PNG preview using `pdfPreview.ts`
3. Upload original file to IPFS (Pinata)
4. Upload preview to IPFS (if PDF)
5. Compute SHA-256 hash
6. Return all metadata

#### 4. OCR Endpoint (`POST /api/ocr`)
- Already supports `application/pdf` in `ALLOWED_TYPES`
- Gemini AI processes PDF directly via inline data
- Model failover: `gemini-flash-latest` → `gemini-2.0-flash-exp` → `gemini-1.5-flash`

#### 5. Index Endpoint (`POST /api/certificates/index`)
```typescript
// New fields accepted:
{
  mediaMime: "application/pdf",
  mediaPages: 3,
  previewCid: "Qm...",
  // ... existing fields
}
```

### Frontend

#### 1. Upload Component (`src/components/UploadArea.tsx`)
```typescript
<UploadArea
  onFile={handleFileChange}
  isPdf={isPdf}
  pdfPages={pdfPages}
  pdfPreviewCid={pdfPreviewCid}
  previewUrl={previewUrl}
/>
```

**Features:**
- Accepts `application/pdf` in file picker
- Displays PDF badge with page count
- Shows SVG preview via proxy endpoint
- **Always uses proxy** for PDF previews (never direct gateway)
- Robust `<object>` + `<img>` fallback rendering
- Fixed height container (220px) with visible background
- Error logging for debugging

**DEV Mode Debug Tools:**
- 🐛 **Debug button** - Calls `/api/ipfs/preview/:cid.debug` and logs JSON
- 🔗 **Open in tab** - Opens preview URL in new tab
- Auto-refresh on tab visibility change (recovers from `ERR_NETWORK_IO_SUSPENDED`)

**Preview Rendering:**
```tsx
<div className="w-full h-[220px] rounded-lg bg-white/60 dark:bg-zinc-900/40 ring-1 ring-black/5 overflow-hidden">
  <object
    data={`${API_URL}/api/ipfs/preview/${pdfPreviewCid}.svg`}
    type="image/svg+xml"
    className="w-full h-full object-contain"
    onError={(e) => console.warn('[Preview<object>] error', e)}
  >
    <img
      src={`${API_URL}/api/ipfs/preview/${pdfPreviewCid}.svg`}
      alt="Certificate preview"
      className="w-full h-full object-contain"
      onError={(e) => console.warn('[Preview<img>] fallback error', e)}
    />
  </object>
</div>
```

#### 2. Zustand Store (`src/stores/useMintFlowStore.ts`)
```typescript
interface MintFlowState {
  isPdf: boolean;
  pdfPages: number | null;
  pdfPreviewCid: string | null;
  setPdfMetadata: (isPdf: boolean, pages?: number, previewCid?: string) => void;
}
```

#### 3. Mint Flow (`src/pages/Index.tsx`)
```typescript
// 1. Upload PDF → get preview
const uploadData = await axios.post('/api/ipfs/upload-media', formData);
const { cid, previewCid, previewUrl, pages, mime, sha256 } = uploadData.data;

// 2. Create metadata with preview
const metadata = {
  image: previewUrl || imageUrl, // Use preview for PDFs
  attributes: [
    { trait_type: 'Media Type', value: 'PDF' },
    { trait_type: 'Pages', value: pages.toString() },
    // ... other attributes
  ]
};

// 3. Index with PDF metadata
await axios.post('/api/certificates/index', {
  mediaMime: mime,
  mediaPages: pages,
  previewCid: previewCid,
  // ... other fields
});
```

---

## Database Migration

**File:** `supabase/migrations/20240102000000_add_pdf_support.sql`

```sql
ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS media_mime TEXT,
  ADD COLUMN IF NOT EXISTS media_pages INTEGER,
  ADD COLUMN IF NOT EXISTS preview_cid TEXT,
  ADD COLUMN IF NOT EXISTS ocr_text JSONB;

CREATE INDEX IF NOT EXISTS idx_certificates_media_mime 
  ON certificates(media_mime);
```

**Apply migration:**
```bash
# Via Supabase MCP (if available)
supabase.deploy_migrations()

# Or manually via Supabase dashboard SQL editor
```

---

## Usage Examples

### Upload PDF Certificate
```typescript
const file = new File([pdfBlob], 'certificate.pdf', { type: 'application/pdf' });

// Upload
const response = await fetch('/api/ipfs/upload-media', {
  method: 'POST',
  body: formData
});

const { cid, previewCid, pages } = await response.json();
console.log(`PDF uploaded: ${cid}, Preview: ${previewCid}, Pages: ${pages}`);
```

### OCR PDF
```typescript
const formData = new FormData();
formData.append('file', pdfFile);

const ocrResponse = await fetch('/api/ocr', {
  method: 'POST',
  body: formData
});

const { student_name, course_name, verification_score } = await ocrResponse.json();
```

### Mint PDF Certificate
```typescript
// Same flow as images, but:
// - Upload returns previewCid
// - Metadata uses preview image
// - Database stores PDF metadata
```

---

## Anti-Duplicate Protection

All existing protections apply to PDFs:

✅ **Fingerprint Check**
- SHA-256 hash of `institution|student|course|date`
- Prevents duplicate certificates with same data

✅ **Image Hash Check** (Optional)
- SHA-256 of original PDF file
- Stored in `image_sha256` column
- Prevents re-upload of same PDF

✅ **Institution Approval**
- Institution must have `status='approved'`
- Returns 403 if not approved

✅ **OCR Confidence**
- Minimum 70% score OR user confirmation
- Returns 422 if low confidence without confirmation

---

## Testing Checklist

### ✅ PDF Upload Flow
- [ ] Upload single-page PDF → preview generated
- [ ] Upload multi-page PDF → page count correct
- [ ] Preview displays in UI with badge
- [ ] Original PDF + preview both on IPFS

### ✅ OCR Processing
- [ ] Gemini extracts fields from PDF
- [ ] Confidence score calculated
- [ ] Low confidence requires confirmation

### ✅ Minting
- [ ] NFT minted with preview image
- [ ] Metadata includes PDF attributes
- [ ] Database stores all PDF metadata

### ✅ Anti-Duplicate
- [ ] Same PDF → 409 duplicate error
- [ ] Same data (different PDF) → 409 fingerprint error
- [ ] Unapproved institution → 403 error
- [ ] Low confidence without confirm → 422 error

### ✅ Regression
- [ ] PNG/JPG upload still works
- [ ] Image OCR still works
- [ ] Image minting still works

---

## Dependencies

**Backend:**
```json
{
  "pdfjs-dist": "^4.11.0",
  "canvas": "^2.11.2"
}
```

**Configuration:**
```env
MAX_UPLOAD_MB=15
GEMINI_MODEL=gemini-flash-latest
GEMINI_TIMEOUT_MS=30000
```

---

## Troubleshooting

### Preview Not Displaying in UI
**Symptom:** Blank preview box after PDF upload

**Debug Steps:**
1. **Check Network Tab:**
   - Look for `/api/ipfs/preview/:cid.svg` request
   - Should return `200` with `Content-Type: image/svg+xml`
   - If `502`: All gateways failed (check server logs)
   - If `400`: Invalid CID format

2. **Use Debug Endpoint:**
   ```bash
   curl -s "$API_URL/api/ipfs/preview/$CID.debug" | jq
   ```
   - Check `gatewaysTried` array for failures
   - Verify `finalUrl` is accessible
   - Review `sample` to confirm valid SVG

3. **Check Browser Console:**
   - Look for `[Preview<object>] error` or `[Preview<img>] fallback error`
   - Check for `ERR_NETWORK_IO_SUSPENDED` (tab was suspended)
   - Verify proxy URL is correct: `${API_URL}/api/ipfs/preview/${cid}.svg`

4. **DEV Mode Tools:**
   - Click **Debug** button to fetch diagnostics
   - Click **Open in tab** to test preview URL directly
   - Switch tabs and return to trigger auto-refresh

5. **Server Logs:**
   ```
   [ipfs.preview] cid=QmXxx
   [ipfs.preview.try] url=... status=200 type=image/svg+xml
   [ipfs.preview.ok] url=... bytes=1234 time=123ms
   ```
   - If all gateways timeout: Check network/firewall
   - If wrong content-type: Gateway misconfiguration
   - If response doesn't start with `<svg`: Invalid preview file

### PDF Preview Generation Fails
**Error:** `Failed to generate PDF preview`

**Solutions:**
1. Check `pdfjs-dist` and `canvas` installed
2. Verify PDF is valid (not corrupted)
3. Check server memory (large PDFs need more RAM)
4. Review server logs for detailed error

### Gateway Fallback Not Working
**Symptom:** Preview fails even though CID is valid

**Solutions:**
1. Check server logs for gateway attempts:
   ```
   [ipfs.preview.try] url=https://gateway.pinata.cloud/ipfs/QmXxx status=404
   [ipfs.preview.try] url=https://cloudflare-ipfs.com/ipfs/QmXxx status=200
   ```
2. Verify all gateways are accessible from server
3. Check if CID exists on IPFS network (may take time to propagate)
4. Use debug endpoint to see detailed gateway probe results

### OCR Returns Low Confidence
**Error:** Verification score < 70

**Solutions:**
1. Ensure PDF has clear, readable text
2. Check if PDF is scanned image (may need better OCR)
3. User can manually confirm fields
4. Try re-uploading with higher quality PDF

### IPFS Upload Timeout
**Error:** Pinata upload failed

**Solutions:**
1. Check `PINATA_JWT` environment variable
2. Verify file size < 15MB
3. Check network connectivity
4. Review Pinata dashboard for quota limits

---

## Future Enhancements

🔮 **Potential Improvements:**
- Multi-page OCR (extract from all pages)
- PDF text search in database
- PDF compression before upload
- Client-side PDF preview (reduce server load)
- Support for password-protected PDFs
- PDF/A validation for archival compliance

---

## API Reference

### GET /api/ipfs/preview/:cid.svg
**Description:** Proxy IPFS SVG preview with correct Content-Type and multi-gateway fallback

**Parameters:**
- `cid` (path) - IPFS CID (must match `^(Qm|baf)[A-Za-z0-9]+$`)

**Response Headers:**
```
Content-Type: image/svg+xml; charset=utf-8
Cache-Control: public, max-age=300, s-maxage=300, stale-while-revalidate=60
X-IPFS-Gateway: https://gateway.pinata.cloud/ipfs/QmXxx
X-Response-Time: 123ms
```

**Success (200):**
```xml
<svg xmlns="http://www.w3.org/2000/svg" ...>
  <!-- SVG content -->
</svg>
```

**Errors:**
```json
// 400 - Invalid CID
{"error": "invalid_cid", "message": "CID must match pattern: ^(Qm|baf)[A-Za-z0-9]+$", "cid": "invalid"}

// 502 - All gateways failed
{"error": "bad_gateway", "message": "All IPFS gateways failed to retrieve SVG", "cid": "QmXxx", "gatewaysTried": [...]}

// 500 - Internal error
{"error": "preview_proxy_error", "message": "...", "cid": "QmXxx"}
```

### GET /api/ipfs/preview/:cid.debug
**Description:** Diagnostic endpoint for troubleshooting preview issues

**Parameters:**
- `cid` (path) - IPFS CID to diagnose

**Success (200):**
```json
{
  "cid": "QmXxx",
  "finalUrl": "https://gateway.pinata.cloud/ipfs/QmXxx",
  "status": 200,
  "contentType": "image/svg+xml",
  "bytes": 1234,
  "gatewaysTried": [
    {"url": "https://gateway.pinata.cloud/ipfs/QmXxx", "headStatus": 200, "headType": "image/svg+xml", "durationMs": 123},
    {"url": "https://cloudflare-ipfs.com/ipfs/QmXxx", "error": "timeout"}
  ],
  "sample": "<svg xmlns=\"http://www.w3.org/2000/svg\" ... (first 200 chars)",
  "durationMs": 456
}
```

**Errors:**
```json
// 400 - Invalid CID
{"error": "invalid_cid", "message": "...", "cid": "invalid"}

// 502 - All gateways failed
{"error": "bad_gateway", "message": "All IPFS gateways failed", "cid": "QmXxx", "gatewaysTried": [...], "lastStatus": 404, "lastContentType": "text/html"}
```

### POST /api/ipfs/upload-media
**Request:**
```
Content-Type: multipart/form-data
file: <File> (image or PDF)
```

**Response:**
```json
{
  "ok": true,
  "cid": "QmXxx",
  "url": "https://gateway.pinata.cloud/ipfs/QmXxx",
  "previewCid": "QmYyy",
  "previewUrl": "https://gateway.pinata.cloud/ipfs/QmYyy",
  "mime": "application/pdf",
  "pages": 3,
  "sha256": "abc123...",
  "width": 1200,
  "height": 1600,
  "size": 1234567,
  "timestamp": "2024-01-02T12:00:00Z"
}
```

### POST /api/ocr
**Request:**
```
Content-Type: multipart/form-data
file: <File> (image or PDF)
```

**Response:**
```json
{
  "student_name": "John Doe",
  "course_name": "Web Development",
  "institution": "Tech University",
  "issue_date": "2024-01-15",
  "fields_confidence": {
    "student_name": 0.95,
    "course_name": 0.92,
    "institution": 0.88,
    "issue_date": 0.85
  },
  "verification_score": 90,
  "verification_notes": "High confidence extraction"
}
```

### POST /api/certificates/index
**Request:**
```json
{
  "institution": "Tech University",
  "studentName": "John Doe",
  "courseName": "Web Development",
  "issueDate": "2024-01-15",
  "owner": "0x123...",
  "imageCid": "QmXxx",
  "metaCid": "QmZzz",
  "txHash": "0xabc...",
  "score": 90,
  "mediaMime": "application/pdf",
  "mediaPages": 3,
  "previewCid": "QmYyy"
}
```

**Response:**
```json
{
  "ok": true,
  "certificate": {
    "id": "uuid-xxx",
    "cert_id": "tech-university-1704196800000",
    "media_mime": "application/pdf",
    "media_pages": 3,
    "preview_cid": "QmYyy",
    "created_at": "2024-01-02T12:00:00Z"
  }
}
```

---

## License

Same as main project (see root LICENSE file).
