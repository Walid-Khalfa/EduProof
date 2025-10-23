# Admin API Documentation

This document describes the admin-only API endpoints for managing institutions in the EduProof platform.

---

## Authentication

All admin endpoints require authentication via the `x-admin-key` header.

```bash
x-admin-key: <ADMIN_API_KEY>
```

The `ADMIN_API_KEY` is configured in `.env.server` and should be a secure UUID or random string.

**Example:**
```bash
curl http://localhost:3001/api/admin/institutions \
  -H "x-admin-key: 5df7e6ce-2b4f-4e7c-9a3f-4a7efb2a6f6a"
```

---

## Endpoints

### 1. List Institutions

**GET** `/api/admin/institutions`

List all institutions with pagination and optional search.

**Query Parameters:**
- `limit` (optional, default: 50) - Number of results per page
- `offset` (optional, default: 0) - Pagination offset
- `search` (optional) - Search by normalized institution name

**Example Request:**
```bash
curl "http://localhost:3001/api/admin/institutions?limit=10&offset=0" \
  -H "x-admin-key: $ADMIN_API_KEY"
```

**Example Response:**
```json
{
  "items": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Harvard University",
      "name_normalized": "harvard-university",
      "did_uri": "did:web:harvard.edu",
      "min_verification_score": 85,
      "status": "approved",
      "created_at": "2025-01-15T10:00:00.000Z",
      "updated_at": "2025-01-15T10:00:00.000Z"
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "name": "MIT",
      "name_normalized": "mit",
      "did_uri": "did:web:mit.edu",
      "min_verification_score": 90,
      "status": "pending",
      "created_at": "2025-01-16T12:00:00.000Z",
      "updated_at": "2025-01-16T12:00:00.000Z"
    }
  ],
  "total": 42,
  "limit": 10,
  "offset": 0
}
```

**Search Example:**
```bash
curl "http://localhost:3001/api/admin/institutions?search=harvard" \
  -H "x-admin-key: $ADMIN_API_KEY"
```

---

### 2. Create Institution

**POST** `/api/admin/institutions`

Create a new institution record.

**Request Body:**
```json
{
  "name": "Stanford University",
  "did_uri": "did:web:stanford.edu",
  "min_verification_score": 85
}
```

**Field Descriptions:**
- `name` (required, string) - Institution display name
- `did_uri` (optional, string) - Decentralized identifier URI
- `min_verification_score` (optional, number, default: 70) - Minimum OCR confidence score (0-100)

**Example Request:**
```bash
curl -X POST http://localhost:3001/api/admin/institutions \
  -H "x-admin-key: $ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Stanford University",
    "did_uri": "did:web:stanford.edu",
    "min_verification_score": 85
  }'
```

**Example Response:**
```json
{
  "id": "770e8400-e29b-41d4-a716-446655440002",
  "name": "Stanford University",
  "name_normalized": "stanford-university",
  "did_uri": "did:web:stanford.edu",
  "min_verification_score": 85,
  "status": "pending",
  "created_at": "2025-01-20T14:30:00.000Z",
  "updated_at": "2025-01-20T14:30:00.000Z"
}
```

**Error Responses:**
- `400` - Missing required field `name`
- `409` - Institution with normalized name already exists
- `401` - Missing or invalid admin key

---

### 3. Update Institution

**PATCH** `/api/admin/institutions/:id`

Update an existing institution's details.

**URL Parameters:**
- `id` (required) - Institution UUID

**Request Body (all fields optional):**
```json
{
  "name": "Stanford University (Updated)",
  "did_uri": "did:web:stanford.edu:v2",
  "min_verification_score": 90
}
```

**Example Request:**
```bash
curl -X PATCH http://localhost:3001/api/admin/institutions/770e8400-e29b-41d4-a716-446655440002 \
  -H "x-admin-key: $ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "min_verification_score": 90
  }'
```

**Example Response:**
```json
{
  "id": "770e8400-e29b-41d4-a716-446655440002",
  "name": "Stanford University",
  "name_normalized": "stanford-university",
  "did_uri": "did:web:stanford.edu:v2",
  "min_verification_score": 90,
  "status": "pending",
  "created_at": "2025-01-20T14:30:00.000Z",
  "updated_at": "2025-01-20T15:00:00.000Z"
}
```

**Error Responses:**
- `404` - Institution not found
- `401` - Missing or invalid admin key

---

### 4. Approve Institution

**POST** `/api/admin/institutions/:id/approve`

Approve a pending institution, changing status to `approved`.

**URL Parameters:**
- `id` (required) - Institution UUID

**Example Request:**
```bash
curl -X POST http://localhost:3001/api/admin/institutions/770e8400-e29b-41d4-a716-446655440002/approve \
  -H "x-admin-key: $ADMIN_API_KEY"
```

**Example Response:**
```json
{
  "id": "770e8400-e29b-41d4-a716-446655440002",
  "name": "Stanford University",
  "name_normalized": "stanford-university",
  "did_uri": "did:web:stanford.edu",
  "min_verification_score": 90,
  "status": "approved",
  "created_at": "2025-01-20T14:30:00.000Z",
  "updated_at": "2025-01-20T15:30:00.000Z"
}
```

**Error Responses:**
- `404` - Institution not found
- `401` - Missing or invalid admin key

---

### 5. Revoke Institution

**POST** `/api/admin/institutions/:id/revoke`

Revoke an institution's approval, changing status to `revoked`.

**URL Parameters:**
- `id` (required) - Institution UUID

**Example Request:**
```bash
curl -X POST http://localhost:3001/api/admin/institutions/770e8400-e29b-41d4-a716-446655440002/revoke \
  -H "x-admin-key: $ADMIN_API_KEY"
```

**Example Response:**
```json
{
  "id": "770e8400-e29b-41d4-a716-446655440002",
  "name": "Stanford University",
  "name_normalized": "stanford-university",
  "did_uri": "did:web:stanford.edu",
  "min_verification_score": 90,
  "status": "revoked",
  "created_at": "2025-01-20T14:30:00.000Z",
  "updated_at": "2025-01-20T16:00:00.000Z"
}
```

**Error Responses:**
- `404` - Institution not found
- `401` - Missing or invalid admin key

---

## Institution Status Values

- `pending` - Newly created, awaiting approval
- `approved` - Verified and active
- `revoked` - Previously approved but now disabled

---

## Name Normalization

Institution names are automatically normalized for search and duplicate detection:
- Converted to lowercase
- Spaces replaced with hyphens
- Special characters removed
- Accents removed (e.g., "é" → "e")

**Examples:**
- "Harvard University" → `harvard-university`
- "École Polytechnique" → `ecole-polytechnique`
- "MIT (Massachusetts Institute of Technology)" → `mit-massachusetts-institute-of-technology`

---

## Complete Workflow Example

### 1. Create a new institution
```bash
curl -X POST http://localhost:3001/api/admin/institutions \
  -H "x-admin-key: $ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "University of California, Berkeley",
    "did_uri": "did:web:berkeley.edu",
    "min_verification_score": 85
  }'
```

### 2. List all institutions to find the ID
```bash
curl "http://localhost:3001/api/admin/institutions?search=berkeley" \
  -H "x-admin-key: $ADMIN_API_KEY"
```

### 3. Update verification score
```bash
curl -X PATCH http://localhost:3001/api/admin/institutions/<institution-id> \
  -H "x-admin-key: $ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "min_verification_score": 90
  }'
```

### 4. Approve the institution
```bash
curl -X POST http://localhost:3001/api/admin/institutions/<institution-id>/approve \
  -H "x-admin-key: $ADMIN_API_KEY"
```

### 5. If needed, revoke later
```bash
curl -X POST http://localhost:3001/api/admin/institutions/<institution-id>/revoke \
  -H "x-admin-key: $ADMIN_API_KEY"
```

---

## Security Best Practices

1. **Protect Admin Key**
   - Store `ADMIN_API_KEY` in `.env.server` only
   - Never commit to version control
   - Use a strong, randomly generated UUID
   - Rotate periodically

2. **Use HTTPS in Production**
   - All admin requests should use HTTPS
   - Never send admin key over unencrypted connections

3. **Audit Logging**
   - All admin actions are logged server-side
   - Monitor logs for suspicious activity

4. **Rate Limiting**
   - Consider implementing rate limits for admin endpoints
   - Prevent brute-force attacks on admin key

---

## Error Codes

| Code | Description |
|------|-------------|
| 200  | Success |
| 400  | Bad request (missing required fields) |
| 401  | Unauthorized (missing or invalid admin key) |
| 404  | Institution not found |
| 409  | Conflict (duplicate institution name) |
| 500  | Internal server error |

---

## Testing Admin Endpoints

Use the provided test script:

```bash
# Set your admin key
export ADMIN_API_KEY="5df7e6ce-2b4f-4e7c-9a3f-4a7efb2a6f6a"

# Run admin tests
./test-admin.sh
```

Or test manually:

```bash
# List institutions
curl http://localhost:3001/api/admin/institutions \
  -H "x-admin-key: $ADMIN_API_KEY" | jq

# Create test institution
curl -X POST http://localhost:3001/api/admin/institutions \
  -H "x-admin-key: $ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test University", "min_verification_score": 80}' | jq

# Search
curl "http://localhost:3001/api/admin/institutions?search=test" \
  -H "x-admin-key: $ADMIN_API_KEY" | jq
```
