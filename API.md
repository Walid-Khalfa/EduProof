# EduProof API Documentation

This document describes the public API endpoints for the EduProof platform.

**Base URL:** `http://localhost:3001` (development) or your deployed backend URL

---

## Table of Contents

1. [Health Check](#health-check)
2. [OCR (Optical Character Recognition)](#ocr)
3. [IPFS Upload](#ipfs-upload)
4. [IPFS Preview Proxy](#ipfs-preview-proxy)
5. [Certificate Management](#certificate-management)

---

## Health Check

### GET `/api/health`

Check the health status of all backend services.

**Request:**
```bash
curl http://localhost:3001/api/health
```

**Response (200 OK):**
```json
{
  "ok": true,
  "timestamp": "2025-01-20T17:00:00.000Z",
  "gemini": {
    "configured": true,
    "model": "gemini-flash-latest"
  },
  "pinata": {
    "configured": true
  },
  "supabase": {
    "status": "connected"
  }
}
```

**Response Fields:**
- `ok` (boolean) - Overall health status
- `timestamp` (string) - ISO 8601 timestamp
- `gemini.configured` (boolean) - Gemini API key present
- `gemini.model` (string) - Current Gemini model name
- `pinata.configured` (boolean) - Pinata credentials present
- `supabase.status` (string) - Database connection status

**Use Cases:**
- Monitoring and alerting
- Pre-flight checks before operations
- Debugging configuration issues

---

## OCR

### POST `/api/ocr`

Extract certificate data from an uploaded image or PDF using Google Gemini AI.

**Request:**
```bash
curl -X POST http://localhost:3001/api/ocr \
  -F "file=@certificate.pdf"
```

**Supported File Types:**
- `image/png`
- `image/jpeg`
- `image/jpg`
- `image/webp`
- `image/heic`
- `image/heif`
- `image/svg+xml`
- `application/pdf`

**File Size Limit:** 15MB (configurable via `MAX_UPLOAD_MB`)

**Response (200 OK):**
```json
{
  "student_name": "John Doe",
  "course_name": "Introduction to Machine Learning",
  "institution": "Stanford University",
  "issue_date": "2024-12-15",
  "fields_confidence": {
    "student_name": 0.95,
    "course_name": 0.92,
    "institution": 0.98,
    "issue_date": 0.88
  },
  "verification_notes": "All fields extracted with high confidence. Date format normalized to YYYY-MM-DD.",
  "verification_score": 93
}
```

**Response Fields:**
- `student_name` (string) - Extracted student name (empty string if not found)
- `course_name` (string) - Extracted course/program name
- `institution` (string) - Extracted institution name
- `issue_date` (string) - Extracted date in YYYY-MM-DD format
- `fields_confidence` (object) - Confidence scores (0.0-1.0) for each field
- `verification_notes` (string) - AI-generated notes about extraction quality
- `verification_score` (number) - Overall confidence score (0-100)

**Error Responses:**

**400 Bad Request** - Missing file
```json
{
  "error": "Missing file (field \"file\")"
}
```

**415 Unsupported Media Type** - Invalid file type
```json
{
  "error": "Unsupported type: application/zip"
}
```

**502 Bad Gateway** - Gemini API error
```json
{
  "error": "Gemini HTTP error",
  "details": {
    "error": {
      "code": 503,
      "message": "The model is overloaded. Please try again later.",
      "status": "UNAVAILABLE"
    }
  }
}
```

**Model Fallback Strategy:**
1. Try `gemini-flash-latest` (primary)
2. If fails, try `gemini-2.5-flash`
3. If fails, try `gemini-2.5-pro`
4. Return error if all models fail

**Timeout:** 30 seconds (configurable via `GEMINI_TIMEOUT_MS`)

---

## IPFS Upload

### POST `/api/ipfs/upload-image`

Upload an image or PDF to IPFS via Pinata.

**Request:**
```bash
curl -X POST http://localhost:3001/api/ipfs/upload-image \
  -F "file=@certificate.pdf" \
  -F "name=John Doe Certificate"
```

**Form Fields:**
- `file` (required) - Image or PDF file
- `name` (optional) - Descriptive name for pinning metadata

**Response (200 OK) - Image:**
```json
{
  "cid": "QmX7Zd9...",
  "mime": "image/png",
  "url": "https://gateway.pinata.cloud/ipfs/QmX7Zd9..."
}
```

**Response (200 OK) - PDF with Preview:**
```json
{
  "cid": "QmY8Ae3...",
  "previewCid": "QmZ9Bf4...",
  "mime": "application/pdf",
  "previewMime": "image/svg+xml",
  "url": "https://gateway.pinata.cloud/ipfs/QmY8Ae3...",
  "previewUrl": "https://gateway.pinata.cloud/ipfs/QmZ9Bf4..."
}
```

**Response Fields:**
- `cid` (string) - IPFS content identifier for original file
- `previewCid` (string, PDF only) - IPFS CID for SVG preview
- `mime` (string) - Original file MIME type
- `previewMime` (string, PDF only) - Preview MIME type (always `image/svg+xml`)
- `url` (string) - IPFS gateway URL for original file
- `previewUrl` (string, PDF only) - IPFS gateway URL for preview

**Error Responses:**

**400 Bad Request**
```json
{
  "error": "No file uploaded"
}
```

**500 Internal Server Error**
```json
{
  "error": "IPFS upload failed",
  "details": "..."
}
```

---

### POST `/api/ipfs/upload-metadata`

Upload ERC-721 metadata JSON to IPFS.

**Request:**
```bash
curl -X POST http://localhost:3001/api/ipfs/upload-metadata \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Certificate #12345",
    "description": "Machine Learning Certificate for John Doe",
    "image": "ipfs://QmX7Zd9...",
    "attributes": [
      {"trait_type": "Student", "value": "John Doe"},
      {"trait_type": "Course", "value": "Introduction to ML"},
      {"trait_type": "Institution", "value": "Stanford University"},
      {"trait_type": "Issue Date", "value": "2024-12-15"}
    ]
  }'
```

**Request Body (ERC-721 Metadata Standard):**
```typescript
{
  name: string;           // NFT name
  description: string;    // NFT description
  image: string;          // IPFS URI (ipfs://...)
  attributes: Array<{     // Certificate attributes
    trait_type: string;
    value: string;
  }>;
}
```

**Response (200 OK):**
```json
{
  "cid": "QmA1Bc2...",
  "url": "https://gateway.pinata.cloud/ipfs/QmA1Bc2..."
}
```

**Error Responses:**

**400 Bad Request**
```json
{
  "error": "Invalid metadata: missing required field 'name'"
}
```

---

## IPFS Preview Proxy

### GET `/api/ipfs/preview/:cid.svg`

Proxy endpoint for PDF preview SVGs stored on IPFS.

**Purpose:**
- Avoid CORS issues with direct IPFS gateway access
- Provide consistent preview URLs
- Enable HEAD pre-checks for preview availability

**Request:**
```bash
curl http://localhost:3001/api/ipfs/preview/QmZ9Bf4....svg
```

**Response (200 OK):**
```
Content-Type: image/svg+xml
Access-Control-Allow-Origin: *

<svg xmlns="http://www.w3.org/2000/svg" ...>
  <!-- SVG content -->
</svg>
```

**Error Responses:**

**404 Not Found**
```json
{
  "error": "Preview not found on IPFS"
}
```

**500 Internal Server Error**
```json
{
  "error": "Failed to fetch preview from IPFS"
}
```

**HEAD Request Support:**

Frontend uses HEAD requests to check preview availability before rendering:

```bash
curl -I http://localhost:3001/api/ipfs/preview/QmZ9Bf4....svg
```

**Response:**
```
HTTP/1.1 200 OK
Content-Type: image/svg+xml
Content-Length: 45678
```

---

### GET `/api/ipfs/preview/:cid.debug`

Debug endpoint to inspect preview generation details.

**Request:**
```bash
curl http://localhost:3001/api/ipfs/preview/QmY8Ae3....debug
```

**Response (200 OK):**
```json
{
  "cid": "QmY8Ae3...",
  "ipfsUrl": "https://gateway.pinata.cloud/ipfs/QmY8Ae3...",
  "previewGenerated": true,
  "previewCid": "QmZ9Bf4...",
  "error": null
}
```

---

## Certificate Management

### GET `/api/certificates/availability`

Check if a certificate ID is already registered (anti-duplicate check).

**Query Parameters:**
- `certId` (required) - Certificate ID to check

**Request:**
```bash
curl "http://localhost:3001/api/certificates/availability?certId=CERT-2024-12345"
```

**Response (200 OK) - Available:**
```json
{
  "available": true,
  "certId": "CERT-2024-12345"
}
```

**Response (200 OK) - Already Exists:**
```json
{
  "available": false,
  "certId": "CERT-2024-12345",
  "existingCertificate": {
    "id": "uuid-...",
    "cert_id": "CERT-2024-12345",
    "student_name": "John Doe",
    "institution": "Stanford University",
    "owner_address": "0x123...",
    "created_at": "2024-12-15T10:00:00.000Z"
  }
}
```

**Error Responses:**

**400 Bad Request**
```json
{
  "error": "Missing certId parameter"
}
```

---

### POST `/api/certificates/index`

Index a newly minted certificate in the database.

**Request:**
```bash
curl -X POST http://localhost:3001/api/certificates/index \
  -H "Content-Type: application/json" \
  -H "x-idempotency-key: abc123..." \
  -d '{
    "certId": "CERT-2024-12345",
    "studentName": "John Doe",
    "courseName": "Introduction to ML",
    "institution": "Stanford University",
    "issueDate": "2024-12-15",
    "ownerAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bfbE",
    "tokenId": "1",
    "metadataUri": "ipfs://QmA1Bc2...",
    "imageUri": "ipfs://QmX7Zd9...",
    "txHash": "0xabc123...",
    "verificationScore": 93
  }'
```

**Request Headers:**
- `x-idempotency-key` (optional) - Prevents duplicate indexing

**Request Body:**
```typescript
{
  certId: string;           // Unique certificate ID
  studentName: string;      // Student name
  courseName: string;       // Course/program name
  institution: string;      // Institution name
  issueDate: string;        // ISO date string
  ownerAddress: string;     // Ethereum address (0x...)
  tokenId: string;          // NFT token ID
  metadataUri: string;      // IPFS metadata URI
  imageUri: string;         // IPFS image URI
  txHash: string;           // Blockchain transaction hash
  verificationScore: number; // OCR confidence (0-100)
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "certificateId": "uuid-..."
}
```

**Error Responses:**

**400 Bad Request**
```json
{
  "error": "Missing required field: certId"
}
```

**409 Conflict** - Duplicate certificate ID
```json
{
  "error": "Certificate with this ID already exists"
}
```

---

### GET `/api/certificates/owner/:address`

Get all certificates owned by a specific Ethereum address.

**URL Parameters:**
- `address` (required) - Ethereum address (0x...)

**Request:**
```bash
curl http://localhost:3001/api/certificates/owner/0x742d35Cc6634C0532925a3b844Bc9e7595f0bfbE
```

**Response (200 OK):**
```json
{
  "certificates": [
    {
      "id": "uuid-1",
      "cert_id": "CERT-2024-12345",
      "student_name": "John Doe",
      "course_name": "Introduction to ML",
      "institution": "Stanford University",
      "issue_date": "2024-12-15T00:00:00.000Z",
      "owner_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bfbE",
      "token_id": "1",
      "metadata_uri": "ipfs://QmA1Bc2...",
      "image_uri": "ipfs://QmX7Zd9...",
      "tx_hash": "0xabc123...",
      "verification_score": 93,
      "created_at": "2024-12-15T10:00:00.000Z"
    }
  ],
  "count": 1
}
```

**Error Responses:**

**400 Bad Request**
```json
{
  "error": "Invalid Ethereum address"
}
```

---

### GET `/api/certificates/verify`

Verify a certificate by ID (searches database, falls back to blockchain).

**Query Parameters:**
- `certId` (required) - Certificate ID to verify

**Request:**
```bash
curl "http://localhost:3001/api/certificates/verify?certId=CERT-2024-12345"
```

**Response (200 OK) - Found in Database:**
```json
{
  "found": true,
  "source": "database",
  "certificate": {
    "id": "uuid-1",
    "cert_id": "CERT-2024-12345",
    "student_name": "John Doe",
    "course_name": "Introduction to ML",
    "institution": "Stanford University",
    "issue_date": "2024-12-15T00:00:00.000Z",
    "owner_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bfbE",
    "token_id": "1",
    "metadata_uri": "ipfs://QmA1Bc2...",
    "image_uri": "ipfs://QmX7Zd9...",
    "tx_hash": "0xabc123...",
    "verification_score": 93,
    "created_at": "2024-12-15T10:00:00.000Z"
  }
}
```

**Response (200 OK) - Not Found:**
```json
{
  "found": false,
  "certId": "CERT-2024-99999"
}
```

**Error Responses:**

**400 Bad Request**
```json
{
  "error": "Missing certId parameter"
}
```

---

## Rate Limits

**Current Limits:**
- OCR: Limited by Gemini API (15 requests/minute on free tier)
- IPFS Upload: No hard limit (Pinata account limits apply)
- Other endpoints: No rate limiting (consider implementing in production)

---

## CORS Configuration

**Allowed Origins:**
- Development: `http://localhost:5173`
- Production: Configured via `FRONTEND_URL` environment variable

**Allowed Methods:** GET, POST, PATCH, DELETE, OPTIONS

**Allowed Headers:** Content-Type, x-admin-key, x-idempotency-key

---

## Error Response Format

All errors follow this structure:

```json
{
  "error": "Human-readable error message",
  "details": { /* Optional additional context */ }
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `400` - Bad request (invalid input)
- `401` - Unauthorized (admin endpoints)
- `404` - Resource not found
- `409` - Conflict (duplicate resource)
- `413` - Payload too large
- `415` - Unsupported media type
- `500` - Internal server error
- `502` - Bad gateway (external service error)
- `503` - Service unavailable (rate limit, overload)
