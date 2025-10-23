# Pinata IPFS Integration Guide for EduProof

## Overview

This guide covers Pinata IPFS integration for the EduProof dApp, including secure file uploads, metadata storage, and best practices for decentralized certificate storage.

---

## Table of Contents

1. [Getting Started with Pinata](#getting-started-with-pinata)
2. [API Endpoints](#api-endpoints)
3. [JWT Authentication](#jwt-authentication)
4. [File Upload Implementation](#file-upload-implementation)
5. [JSON Metadata Upload](#json-metadata-upload)
6. [File Validation and Size Limits](#file-validation-and-size-limits)
7. [Gateway Usage Best Practices](#gateway-usage-best-practices)
8. [Security Considerations](#security-considerations)

---

## Getting Started with Pinata

### 1. Create Pinata Account

1. Sign up at [Pinata Cloud](https://app.pinata.cloud/)
2. Navigate to [API Keys](https://app.pinata.cloud/developer/api-keys)
3. Generate a new API key with required permissions:
   - `pinFileToIPFS`
   - `pinJSONToIPFS`
   - `unpin` (optional, for cleanup)

### 2. Get Your JWT Token

After creating an API key, copy the JWT token. This will be used for authentication.

### 3. Environment Setup

```bash
# .env.local (NEVER commit this file)
PINATA_JWT=your_jwt_token_here
PINATA_GATEWAY=your_dedicated_gateway_url # Optional
```

---

## API Endpoints

### Base URL
```
https://api.pinata.cloud
```

### Available Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/pinning/pinFileToIPFS` | POST | Upload files to IPFS |
| `/pinning/pinJSONToIPFS` | POST | Upload JSON metadata to IPFS |
| `/pinning/unpin/{hash}` | DELETE | Remove pinned content |
| `/data/pinList` | GET | List all pinned content |

---

## JWT Authentication

### Authentication Header

All requests must include the JWT token in the Authorization header:

```typescript
headers: {
  'Authorization': `Bearer ${process.env.PINATA_JWT}`
}
```

### Security Best Practices

1. **Server-Side Only**: Never expose JWT in client-side code
2. **Environment Variables**: Store JWT in server-only environment variables
3. **API Routes**: Use Next.js API routes or Server Actions for Pinata calls

```typescript
// ❌ WRONG - Client-side exposure
'use client';
const jwt = process.env.NEXT_PUBLIC_PINATA_JWT; // DON'T DO THIS

// ✅ CORRECT - Server-side only
// app/api/upload/route.ts
const jwt = process.env.PINATA_JWT; // Server-only variable
```

---

## File Upload Implementation

### Next.js API Route for File Upload

```typescript
// app/api/upload/file/route.ts
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import FormData from 'form-data';

const PINATA_JWT = process.env.PINATA_JWT;
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export async function POST(request: NextRequest) {
  try {
    // Validate JWT configuration
    if (!PINATA_JWT) {
      return NextResponse.json(
        { error: 'Pinata JWT not configured' },
        { status: 500 }
      );
    }

    // Get file from request
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Validate file type (for certificates, typically PDF or images)
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: PDF, PNG, JPEG' },
        { status: 400 }
      );
    }

    // Prepare file for Pinata
    const pinataFormData = new FormData();
    const buffer = Buffer.from(await file.arrayBuffer());
    pinataFormData.append('file', buffer, {
      filename: file.name,
      contentType: file.type,
    });

    // Optional: Add metadata
    const metadata = JSON.stringify({
      name: file.name,
      keyvalues: {
        type: 'certificate',
        uploadedAt: new Date().toISOString(),
      },
    });
    pinataFormData.append('pinataMetadata', metadata);

    // Optional: Add pinning options
    const options = JSON.stringify({
      cidVersion: 1, // Use CIDv1 for better compatibility
    });
    pinataFormData.append('pinataOptions', options);

    // Upload to Pinata
    const response = await axios.post(
      'https://api.pinata.cloud/pinning/pinFileToIPFS',
      pinataFormData,
      {
        headers: {
          ...pinataFormData.getHeaders(),
          Authorization: `Bearer ${PINATA_JWT}`,
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      }
    );

    // Return IPFS hash and URL
    return NextResponse.json({
      success: true,
      ipfsHash: response.data.IpfsHash,
      ipfsUrl: `ipfs://${response.data.IpfsHash}`,
      pinSize: response.data.PinSize,
      timestamp: response.data.Timestamp,
    });

  } catch (error) {
    console.error('Pinata upload error:', error);
    
    if (axios.isAxiosError(error)) {
      return NextResponse.json(
        { error: error.response?.data?.error || 'Upload failed' },
        { status: error.response?.status || 500 }
      );
    }

    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    );
  }
}
```

### Client-Side Upload Component

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function FileUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [ipfsHash, setIpfsHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Client-side validation
      const maxSize = 100 * 1024 * 1024; // 100MB
      if (selectedFile.size > maxSize) {
        setError('File too large. Maximum size: 100MB');
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload/file', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setIpfsHash(data.ipfsHash);
      console.log('Uploaded to IPFS:', data.ipfsUrl);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Input
          type="file"
          onChange={handleFileChange}
          accept=".pdf,.png,.jpg,.jpeg"
          disabled={uploading}
        />
      </div>

      {file && (
        <div className="text-sm text-gray-600">
          Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
        </div>
      )}

      {error && (
        <div className="text-sm text-red-500">{error}</div>
      )}

      {ipfsHash && (
        <div className="text-sm text-green-600">
          Uploaded! IPFS Hash: {ipfsHash}
        </div>
      )}

      <Button
        onClick={handleUpload}
        disabled={!file || uploading}
      >
        {uploading ? 'Uploading...' : 'Upload to IPFS'}
      </Button>
    </div>
  );
}
```

---

## JSON Metadata Upload

### API Route for JSON Upload

```typescript
// app/api/upload/metadata/route.ts
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const PINATA_JWT = process.env.PINATA_JWT;

export async function POST(request: NextRequest) {
  try {
    if (!PINATA_JWT) {
      return NextResponse.json(
        { error: 'Pinata JWT not configured' },
        { status: 500 }
      );
    }

    const metadata = await request.json();

    // Validate metadata structure
    if (!metadata.name || !metadata.description || !metadata.image) {
      return NextResponse.json(
        { error: 'Invalid metadata structure' },
        { status: 400 }
      );
    }

    // Upload JSON to Pinata
    const response = await axios.post(
      'https://api.pinata.cloud/pinning/pinJSONToIPFS',
      {
        pinataContent: metadata,
        pinataMetadata: {
          name: `${metadata.name}-metadata`,
          keyvalues: {
            type: 'certificate-metadata',
            createdAt: new Date().toISOString(),
          },
        },
        pinataOptions: {
          cidVersion: 1,
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${PINATA_JWT}`,
        },
      }
    );

    return NextResponse.json({
      success: true,
      ipfsHash: response.data.IpfsHash,
      ipfsUrl: `ipfs://${response.data.IpfsHash}`,
      pinSize: response.data.PinSize,
      timestamp: response.data.Timestamp,
    });

  } catch (error) {
    console.error('Metadata upload error:', error);
    
    if (axios.isAxiosError(error)) {
      return NextResponse.json(
        { error: error.response?.data?.error || 'Upload failed' },
        { status: error.response?.status || 500 }
      );
    }

    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    );
  }
}
```

### Certificate Metadata Structure

```typescript
// lib/types/metadata.ts
export interface CertificateMetadata {
  name: string;
  description: string;
  image: string; // ipfs:// URL
  external_url?: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
  }>;
}

// Example usage
const metadata: CertificateMetadata = {
  name: "Bachelor of Science in Computer Science",
  description: "Awarded to John Doe for completing the Bachelor of Science program in Computer Science at MIT",
  image: "ipfs://QmXxxx.../certificate.pdf",
  external_url: "https://eduproof.app/certificates/123",
  attributes: [
    { trait_type: "Institution", value: "Massachusetts Institute of Technology" },
    { trait_type: "Degree", value: "Bachelor of Science" },
    { trait_type: "Major", value: "Computer Science" },
    { trait_type: "Graduation Year", value: 2024 },
    { trait_type: "GPA", value: "3.8" },
    { trait_type: "Honors", value: "Cum Laude" },
  ],
};
```

### Upload Metadata Function

```typescript
// lib/ipfs/uploadMetadata.ts
export async function uploadCertificateMetadata(
  metadata: CertificateMetadata
): Promise<string> {
  const response = await fetch('/api/upload/metadata', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(metadata),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Metadata upload failed');
  }

  const data = await response.json();
  return data.ipfsUrl; // Returns ipfs://...
}
```

---

## File Validation and Size Limits

### Pinata Size Limits (2024)

| Plan | Max File Size | Max Upload Rate |
|------|---------------|-----------------|
| Free | 100 MB | Limited |
| Paid | 1 GB | Higher |
| Enterprise | Custom | Custom |

### Validation Implementation

```typescript
// lib/validation/fileValidation.ts
export const FILE_VALIDATION = {
  MAX_SIZE: 100 * 1024 * 1024, // 100MB
  ALLOWED_TYPES: {
    'application/pdf': ['.pdf'],
    'image/png': ['.png'],
    'image/jpeg': ['.jpg', '.jpeg'],
  },
};

export function validateFile(file: File): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > FILE_VALIDATION.MAX_SIZE) {
    return {
      valid: false,
      error: `File too large. Maximum size: ${FILE_VALIDATION.MAX_SIZE / 1024 / 1024}MB`,
    };
  }

  // Check file type
  if (!Object.keys(FILE_VALIDATION.ALLOWED_TYPES).includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Allowed: PDF, PNG, JPEG',
    };
  }

  // Check file extension
  const extension = `.${file.name.split('.').pop()?.toLowerCase()}`;
  const allowedExtensions = FILE_VALIDATION.ALLOWED_TYPES[file.type as keyof typeof FILE_VALIDATION.ALLOWED_TYPES];
  
  if (!allowedExtensions.includes(extension)) {
    return {
      valid: false,
      error: 'File extension does not match file type',
    };
  }

  return { valid: true };
}
```

### Client-Side Validation

```typescript
'use client';

import { validateFile } from '@/lib/validation/fileValidation';

export default function ValidatedUploader() {
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateFile(file);
    
    if (!validation.valid) {
      alert(validation.error);
      e.target.value = ''; // Clear input
      return;
    }

    // Proceed with upload
    uploadFile(file);
  };

  return (
    <input
      type="file"
      onChange={handleFileSelect}
      accept=".pdf,.png,.jpg,.jpeg"
    />
  );
}
```

---

## Gateway Usage Best Practices

### Gateway Types

1. **Public Gateway** (Free, Rate-Limited)
   - `https://gateway.pinata.cloud/ipfs/{CID}`
   - Best for: Development, testing
   - Limitations: Rate limits, slower performance

2. **Dedicated Gateway** (Paid, Recommended for Production)
   - `https://your-gateway.mypinata.cloud/ipfs/{CID}`
   - Best for: Production, high-traffic apps
   - Benefits: No rate limits, faster, custom domain

### Gateway Configuration

```typescript
// lib/ipfs/gateway.ts
const GATEWAYS = {
  pinata: process.env.PINATA_GATEWAY || 'https://gateway.pinata.cloud',
  ipfs: 'https://ipfs.io',
  cloudflare: 'https://cloudflare-ipfs.com',
};

export function getIPFSUrl(ipfsUri: string, gateway: keyof typeof GATEWAYS = 'pinata'): string {
  // Convert ipfs:// to https://
  const hash = ipfsUri.replace('ipfs://', '');
  return `${GATEWAYS[gateway]}/ipfs/${hash}`;
}

// Usage
const ipfsUri = 'ipfs://QmXxxx...';
const httpsUrl = getIPFSUrl(ipfsUri, 'pinata');
// Returns: https://gateway.pinata.cloud/ipfs/QmXxxx...
```

### Fallback Gateway Strategy

```typescript
// lib/ipfs/fetchWithFallback.ts
export async function fetchFromIPFS(ipfsUri: string): Promise<Response> {
  const gateways = ['pinata', 'cloudflare', 'ipfs'] as const;
  
  for (const gateway of gateways) {
    try {
      const url = getIPFSUrl(ipfsUri, gateway);
      const response = await fetch(url, { 
        signal: AbortSignal.timeout(5000) // 5s timeout
      });
      
      if (response.ok) {
        return response;
      }
    } catch (error) {
      console.warn(`Gateway ${gateway} failed, trying next...`);
      continue;
    }
  }
  
  throw new Error('All IPFS gateways failed');
}

// Usage
const metadata = await fetchFromIPFS('ipfs://QmXxxx...').then(r => r.json());
```

### Image Component with IPFS Support

```typescript
'use client';

import Image from 'next/image';
import { useState } from 'react';
import { getIPFSUrl } from '@/lib/ipfs/gateway';

interface IPFSImageProps {
  ipfsUri: string;
  alt: string;
  width: number;
  height: number;
}

export default function IPFSImage({ ipfsUri, alt, width, height }: IPFSImageProps) {
  const [error, setError] = useState(false);
  const [currentGateway, setCurrentGateway] = useState<'pinata' | 'cloudflare' | 'ipfs'>('pinata');

  const handleError = () => {
    // Try next gateway on error
    if (currentGateway === 'pinata') {
      setCurrentGateway('cloudflare');
    } else if (currentGateway === 'cloudflare') {
      setCurrentGateway('ipfs');
    } else {
      setError(true);
    }
  };

  if (error) {
    return <div>Failed to load image</div>;
  }

  return (
    <Image
      src={getIPFSUrl(ipfsUri, currentGateway)}
      alt={alt}
      width={width}
      height={height}
      onError={handleError}
    />
  );
}
```

---

## Security Considerations

### 1. Never Expose JWT Client-Side

```typescript
// ❌ WRONG
'use client';
const jwt = process.env.NEXT_PUBLIC_PINATA_JWT;

// ✅ CORRECT
// Server-side only (API route or Server Action)
const jwt = process.env.PINATA_JWT;
```

### 2. Validate All Inputs

```typescript
// Server-side validation
import { z } from 'zod';

const uploadSchema = z.object({
  file: z.instanceof(File),
  metadata: z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(500),
  }),
});
```

### 3. Rate Limiting

```typescript
// app/api/upload/file/route.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, '1 m'), // 5 uploads per minute
});

export async function POST(request: NextRequest) {
  const ip = request.ip ?? '127.0.0.1';
  const { success } = await ratelimit.limit(ip);

  if (!success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    );
  }

  // Process upload
}
```

### 4. Content Verification

```typescript
// Verify uploaded content matches expected hash
export async function verifyUpload(ipfsHash: string, originalFile: File): Promise<boolean> {
  const uploadedContent = await fetchFromIPFS(`ipfs://${ipfsHash}`);
  const uploadedBuffer = await uploadedContent.arrayBuffer();
  const originalBuffer = await originalFile.arrayBuffer();
  
  return Buffer.compare(
    Buffer.from(uploadedBuffer),
    Buffer.from(originalBuffer)
  ) === 0;
}
```

---

## Complete Upload Flow Example

```typescript
// app/actions/uploadCertificate.ts
'use server';

import { uploadCertificateMetadata } from '@/lib/ipfs/uploadMetadata';
import { CertificateMetadata } from '@/lib/types/metadata';

export async function uploadCertificateFlow(
  certificateFile: File,
  studentName: string,
  institutionName: string,
  degree: string
) {
  // 1. Upload certificate file
  const fileFormData = new FormData();
  fileFormData.append('file', certificateFile);

  const fileResponse = await fetch('/api/upload/file', {
    method: 'POST',
    body: fileFormData,
  });

  if (!fileResponse.ok) {
    throw new Error('File upload failed');
  }

  const fileData = await fileResponse.json();
  const certificateIpfsUrl = fileData.ipfsUrl;

  // 2. Create metadata
  const metadata: CertificateMetadata = {
    name: `${degree} - ${studentName}`,
    description: `Certificate awarded to ${studentName} for completing ${degree} at ${institutionName}`,
    image: certificateIpfsUrl,
    attributes: [
      { trait_type: 'Institution', value: institutionName },
      { trait_type: 'Degree', value: degree },
      { trait_type: 'Student', value: studentName },
      { trait_type: 'Issue Date', value: new Date().toISOString() },
    ],
  };

  // 3. Upload metadata
  const metadataIpfsUrl = await uploadCertificateMetadata(metadata);

  return {
    certificateUrl: certificateIpfsUrl,
    metadataUrl: metadataIpfsUrl,
  };
}
```

---

## References

- [Pinata Documentation](https://docs.pinata.cloud/)
- [Pinata API Reference](https://docs.pinata.cloud/api-reference)
- [IPFS Best Practices](https://docs.ipfs.tech/concepts/best-practices/)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
