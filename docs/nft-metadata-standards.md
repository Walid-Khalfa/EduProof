# NFT Metadata Standards for EduProof

## Overview

This guide covers NFT metadata standards for educational certificates in the EduProof dApp, including ERC-721 schema, OpenSea requirements, IPFS URI formatting, and certificate-specific attributes.

---

## Table of Contents

1. [ERC-721 Metadata Standard](#erc-721-metadata-standard)
2. [OpenSea Metadata Requirements](#opensea-metadata-requirements)
3. [IPFS URI Formatting](#ipfs-uri-formatting)
4. [Certificate Attributes](#certificate-attributes)
5. [Implementation Examples](#implementation-examples)
6. [Best Practices](#best-practices)

---

## ERC-721 Metadata Standard

### Basic Schema

The ERC-721 metadata standard defines a JSON schema for NFT metadata:

```typescript
interface ERC721Metadata {
  name: string;              // Name of the NFT
  description: string;       // Description of the NFT
  image: string;            // URI to the image (ipfs://, https://, etc.)
  external_url?: string;    // URL to view the item on your site
  attributes?: Attribute[]; // Array of attributes/traits
  background_color?: string; // Background color (6-character hex without #)
  animation_url?: string;   // URL to multimedia attachment
  youtube_url?: string;     // URL to YouTube video
}

interface Attribute {
  trait_type: string;       // Name of the trait
  value: string | number;   // Value of the trait
  display_type?: string;    // How to display (optional)
  max_value?: number;       // Max value for numeric traits (optional)
}
```

### Certificate Metadata Example

```json
{
  "name": "Bachelor of Science in Computer Science",
  "description": "This certificate is awarded to John Doe for successfully completing the Bachelor of Science program in Computer Science at Massachusetts Institute of Technology with a GPA of 3.8 and graduating Cum Laude.",
  "image": "ipfs://QmXxxx.../certificate.pdf",
  "external_url": "https://eduproof.app/certificates/123",
  "attributes": [
    {
      "trait_type": "Institution",
      "value": "Massachusetts Institute of Technology"
    },
    {
      "trait_type": "Degree Type",
      "value": "Bachelor of Science"
    },
    {
      "trait_type": "Major",
      "value": "Computer Science"
    },
    {
      "trait_type": "Graduation Year",
      "value": 2024,
      "display_type": "number"
    },
    {
      "trait_type": "GPA",
      "value": "3.8"
    },
    {
      "trait_type": "Honors",
      "value": "Cum Laude"
    },
    {
      "trait_type": "Issue Date",
      "value": "2024-05-15"
    },
    {
      "trait_type": "Certificate Number",
      "value": "MIT-CS-2024-001234"
    }
  ]
}
```

---

## OpenSea Metadata Requirements

### OpenSea-Specific Fields

OpenSea supports additional metadata fields for enhanced display:

```typescript
interface OpenSeaMetadata extends ERC721Metadata {
  // Standard fields
  name: string;
  description: string;
  image: string;
  
  // OpenSea-specific
  external_url?: string;
  background_color?: string;  // 6-character hex (no #)
  animation_url?: string;     // MP4, WEBM, MP3, WAV, OGG, GLB, GLTF
  youtube_url?: string;
  
  // Attributes with display types
  attributes?: Array<{
    trait_type: string;
    value: string | number;
    display_type?: 'number' | 'boost_number' | 'boost_percentage' | 'date';
    max_value?: number;
  }>;
}
```

### Display Types

OpenSea supports special display types for attributes:

1. **Number**: `display_type: "number"`
   - Shows as a numeric value
   - Can include `max_value` for progress bars

2. **Boost Number**: `display_type: "boost_number"`
   - Displayed as a boost (e.g., +10)

3. **Boost Percentage**: `display_type: "boost_percentage"`
   - Displayed as a percentage boost (e.g., +10%)

4. **Date**: `display_type: "date"`
   - Value should be Unix timestamp
   - Displayed as a calendar date

### OpenSea Certificate Example

```json
{
  "name": "Master of Business Administration",
  "description": "MBA degree awarded to Jane Smith from Harvard Business School",
  "image": "ipfs://QmYyyy.../certificate.pdf",
  "external_url": "https://eduproof.app/certificates/456",
  "background_color": "7b3fe4",
  "attributes": [
    {
      "trait_type": "Institution",
      "value": "Harvard Business School"
    },
    {
      "trait_type": "Degree",
      "value": "Master of Business Administration"
    },
    {
      "trait_type": "Specialization",
      "value": "Finance"
    },
    {
      "trait_type": "Graduation Date",
      "value": 1715731200,
      "display_type": "date"
    },
    {
      "trait_type": "Academic Performance",
      "value": 95,
      "display_type": "number",
      "max_value": 100
    },
    {
      "trait_type": "Leadership Score",
      "value": 15,
      "display_type": "boost_number"
    }
  ]
}
```

### ERC-7160 Multi-URI Support

OpenSea supports ERC-7160 for multiple metadata URIs:

```json
{
  "name": "Certificate with Multiple Formats",
  "description": "Certificate available in multiple formats",
  "multi_metadata": [
    {
      "uri": "ipfs://QmPDF.../certificate.pdf",
      "type": "application/pdf",
      "name": "PDF Certificate"
    },
    {
      "uri": "ipfs://QmImage.../certificate.png",
      "type": "image/png",
      "name": "Image Certificate"
    },
    {
      "uri": "ipfs://QmVideo.../ceremony.mp4",
      "type": "video/mp4",
      "name": "Graduation Ceremony"
    }
  ]
}
```

---

## IPFS URI Formatting

### URI Format Standards

**Canonical Format (Recommended):**
```
ipfs://<CID>
ipfs://<CID>/path/to/file
```

**HTTP Gateway Format (Legacy):**
```
https://gateway.pinata.cloud/ipfs/<CID>
https://ipfs.io/ipfs/<CID>
```

### Best Practices

1. **Always use `ipfs://` protocol in metadata**
   - Gateway-independent
   - Future-proof
   - Decentralized

2. **Never hardcode gateway URLs**
   - Gateways can go down
   - Creates centralization risk
   - Reduces portability

3. **Use CIDv1 for better compatibility**
   - More readable
   - Better for subdomains
   - Future-proof

### URI Conversion Utilities

```typescript
// lib/ipfs/uriUtils.ts

/**
 * Convert IPFS URI to HTTP gateway URL
 */
export function ipfsToHttp(
  ipfsUri: string,
  gateway: string = 'https://gateway.pinata.cloud'
): string {
  if (!ipfsUri.startsWith('ipfs://')) {
    return ipfsUri; // Already HTTP or other protocol
  }
  
  const hash = ipfsUri.replace('ipfs://', '');
  return `${gateway}/ipfs/${hash}`;
}

/**
 * Convert HTTP gateway URL to IPFS URI
 */
export function httpToIpfs(url: string): string {
  const ipfsRegex = /\/ipfs\/([a-zA-Z0-9]+(?:\/[^?#]*)?)/;
  const match = url.match(ipfsRegex);
  
  if (match) {
    return `ipfs://${match[1]}`;
  }
  
  return url; // Not an IPFS URL
}

/**
 * Validate IPFS URI format
 */
export function isValidIpfsUri(uri: string): boolean {
  return /^ipfs:\/\/[a-zA-Z0-9]+(?:\/[^?#]*)?$/.test(uri);
}

/**
 * Extract CID from IPFS URI
 */
export function extractCID(ipfsUri: string): string {
  const match = ipfsUri.match(/^ipfs:\/\/([a-zA-Z0-9]+)/);
  return match ? match[1] : '';
}
```

### Usage Examples

```typescript
// Convert for display
const ipfsUri = 'ipfs://QmXxxx.../certificate.pdf';
const httpUrl = ipfsToHttp(ipfsUri);
// Result: https://gateway.pinata.cloud/ipfs/QmXxxx.../certificate.pdf

// Convert for storage
const gatewayUrl = 'https://ipfs.io/ipfs/QmYyyy.../metadata.json';
const ipfsUri = httpToIpfs(gatewayUrl);
// Result: ipfs://QmYyyy.../metadata.json

// Validate
const isValid = isValidIpfsUri('ipfs://QmZzzz...');
// Result: true

// Extract CID
const cid = extractCID('ipfs://QmAaaa.../file.pdf');
// Result: QmAaaa...
```

---

## Certificate Attributes

### Standard Certificate Traits

```typescript
// lib/metadata/certificateTraits.ts

export interface CertificateTraits {
  // Required fields
  institution: string;
  degreeType: string;
  major: string;
  graduationYear: number;
  
  // Optional fields
  studentName?: string;        // Usually omitted for privacy
  gpa?: string;
  honors?: string;
  certificateNumber?: string;
  issueDate?: string;
  expirationDate?: string;
  
  // Additional fields
  minor?: string;
  specialization?: string;
  credits?: number;
  accreditation?: string;
  
  // Verification fields
  verificationUrl?: string;
  blockchainNetwork?: string;
  contractAddress?: string;
  tokenId?: string;
}

export function createCertificateAttributes(
  traits: CertificateTraits
): Attribute[] {
  const attributes: Attribute[] = [];

  // Required attributes
  attributes.push(
    { trait_type: 'Institution', value: traits.institution },
    { trait_type: 'Degree Type', value: traits.degreeType },
    { trait_type: 'Major', value: traits.major },
    { 
      trait_type: 'Graduation Year', 
      value: traits.graduationYear,
      display_type: 'number'
    }
  );

  // Optional attributes
  if (traits.gpa) {
    attributes.push({ trait_type: 'GPA', value: traits.gpa });
  }

  if (traits.honors) {
    attributes.push({ trait_type: 'Honors', value: traits.honors });
  }

  if (traits.certificateNumber) {
    attributes.push({ 
      trait_type: 'Certificate Number', 
      value: traits.certificateNumber 
    });
  }

  if (traits.issueDate) {
    const timestamp = new Date(traits.issueDate).getTime() / 1000;
    attributes.push({ 
      trait_type: 'Issue Date', 
      value: timestamp,
      display_type: 'date'
    });
  }

  if (traits.minor) {
    attributes.push({ trait_type: 'Minor', value: traits.minor });
  }

  if (traits.specialization) {
    attributes.push({ 
      trait_type: 'Specialization', 
      value: traits.specialization 
    });
  }

  if (traits.credits) {
    attributes.push({ 
      trait_type: 'Credits', 
      value: traits.credits,
      display_type: 'number'
    });
  }

  if (traits.accreditation) {
    attributes.push({ 
      trait_type: 'Accreditation', 
      value: traits.accreditation 
    });
  }

  // Blockchain verification attributes
  if (traits.blockchainNetwork) {
    attributes.push({ 
      trait_type: 'Blockchain', 
      value: traits.blockchainNetwork 
    });
  }

  if (traits.contractAddress) {
    attributes.push({ 
      trait_type: 'Contract Address', 
      value: traits.contractAddress 
    });
  }

  if (traits.tokenId) {
    attributes.push({ 
      trait_type: 'Token ID', 
      value: traits.tokenId 
    });
  }

  return attributes;
}
```

### Degree Type Categories

```typescript
export enum DegreeType {
  ASSOCIATE = 'Associate Degree',
  BACHELOR = 'Bachelor Degree',
  MASTER = 'Master Degree',
  DOCTORATE = 'Doctorate',
  CERTIFICATE = 'Certificate',
  DIPLOMA = 'Diploma',
  PROFESSIONAL = 'Professional Degree',
}

export enum HonorsLevel {
  CUM_LAUDE = 'Cum Laude',
  MAGNA_CUM_LAUDE = 'Magna Cum Laude',
  SUMMA_CUM_LAUDE = 'Summa Cum Laude',
  WITH_HONORS = 'With Honors',
  WITH_DISTINCTION = 'With Distinction',
  WITH_HIGH_DISTINCTION = 'With High Distinction',
}
```

---

## Implementation Examples

### Complete Metadata Builder

```typescript
// lib/metadata/builder.ts
import { CertificateTraits, createCertificateAttributes } from './certificateTraits';

export interface BuildMetadataParams {
  name: string;
  description: string;
  imageUri: string;
  externalUrl?: string;
  traits: CertificateTraits;
}

export function buildCertificateMetadata(
  params: BuildMetadataParams
): ERC721Metadata {
  return {
    name: params.name,
    description: params.description,
    image: params.imageUri,
    external_url: params.externalUrl,
    attributes: createCertificateAttributes(params.traits),
  };
}

// Usage example
const metadata = buildCertificateMetadata({
  name: 'Bachelor of Science in Computer Science',
  description: 'Awarded to John Doe for completing the BS in Computer Science program',
  imageUri: 'ipfs://QmXxxx.../certificate.pdf',
  externalUrl: 'https://eduproof.app/certificates/123',
  traits: {
    institution: 'Massachusetts Institute of Technology',
    degreeType: DegreeType.BACHELOR,
    major: 'Computer Science',
    graduationYear: 2024,
    gpa: '3.8',
    honors: HonorsLevel.CUM_LAUDE,
    certificateNumber: 'MIT-CS-2024-001234',
    issueDate: '2024-05-15',
    blockchainNetwork: 'Polygon Amoy',
    contractAddress: '0x0fEFa8D515BF472352d8fFDbC0846bae39faaB82',
  },
});
```

### Metadata Upload Flow

```typescript
// lib/metadata/upload.ts
import { uploadToIPFS } from '@/lib/ipfs/pinata';

export async function uploadCertificateMetadata(
  metadata: ERC721Metadata
): Promise<string> {
  // Validate metadata
  if (!metadata.name || !metadata.description || !metadata.image) {
    throw new Error('Missing required metadata fields');
  }

  // Ensure image uses ipfs:// protocol
  if (!metadata.image.startsWith('ipfs://')) {
    throw new Error('Image must use ipfs:// protocol');
  }

  // Upload metadata JSON to IPFS
  const response = await fetch('/api/upload/metadata', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(metadata),
  });

  if (!response.ok) {
    throw new Error('Metadata upload failed');
  }

  const data = await response.json();
  return data.ipfsUrl; // Returns ipfs://...
}
```

### Complete Certificate Creation Flow

```typescript
// app/actions/createCertificate.ts
'use server';

import { buildCertificateMetadata } from '@/lib/metadata/builder';
import { uploadCertificateMetadata } from '@/lib/metadata/upload';
import { uploadToIPFS } from '@/lib/ipfs/pinata';

export async function createCertificate(
  certificateFile: File,
  traits: CertificateTraits
) {
  // 1. Upload certificate file to IPFS
  const fileFormData = new FormData();
  fileFormData.append('file', certificateFile);

  const fileResponse = await fetch('/api/upload/file', {
    method: 'POST',
    body: fileFormData,
  });

  const fileData = await fileResponse.json();
  const certificateIpfsUri = fileData.ipfsUrl;

  // 2. Build metadata
  const metadata = buildCertificateMetadata({
    name: `${traits.degreeType} in ${traits.major}`,
    description: `This certificate is awarded for completing the ${traits.degreeType} program in ${traits.major} at ${traits.institution}`,
    imageUri: certificateIpfsUri,
    externalUrl: `https://eduproof.app/certificates/${traits.certificateNumber}`,
    traits,
  });

  // 3. Upload metadata to IPFS
  const metadataUri = await uploadCertificateMetadata(metadata);

  return {
    certificateUri: certificateIpfsUri,
    metadataUri,
    metadata,
  };
}
```

### Metadata Viewer Component

```typescript
'use client';

import { useEffect, useState } from 'react';
import { ipfsToHttp } from '@/lib/ipfs/uriUtils';

interface MetadataViewerProps {
  tokenUri: string;
}

export function MetadataViewer({ tokenUri }: MetadataViewerProps) {
  const [metadata, setMetadata] = useState<ERC721Metadata | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMetadata() {
      try {
        const httpUrl = ipfsToHttp(tokenUri);
        const response = await fetch(httpUrl);
        const data = await response.json();
        setMetadata(data);
      } catch (error) {
        console.error('Failed to fetch metadata:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchMetadata();
  }, [tokenUri]);

  if (loading) return <div>Loading metadata...</div>;
  if (!metadata) return <div>Failed to load metadata</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">{metadata.name}</h2>
      <p className="text-gray-600">{metadata.description}</p>

      {metadata.image && (
        <div>
          <h3 className="font-semibold mb-2">Certificate:</h3>
          <a
            href={ipfsToHttp(metadata.image)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline"
          >
            View Certificate
          </a>
        </div>
      )}

      {metadata.attributes && metadata.attributes.length > 0 && (
        <div>
          <h3 className="font-semibold mb-2">Attributes:</h3>
          <div className="grid grid-cols-2 gap-2">
            {metadata.attributes.map((attr, index) => (
              <div key={index} className="border p-2 rounded">
                <div className="text-sm text-gray-500">{attr.trait_type}</div>
                <div className="font-medium">{attr.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {metadata.external_url && (
        <a
          href={metadata.external_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:underline"
        >
          View on EduProof →
        </a>
      )}
    </div>
  );
}
```

---

## Best Practices

### 1. Metadata Validation

```typescript
// lib/metadata/validation.ts
import { z } from 'zod';

const AttributeSchema = z.object({
  trait_type: z.string().min(1),
  value: z.union([z.string(), z.number()]),
  display_type: z.enum(['number', 'boost_number', 'boost_percentage', 'date']).optional(),
  max_value: z.number().optional(),
});

const MetadataSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(1000),
  image: z.string().startsWith('ipfs://'),
  external_url: z.string().url().optional(),
  background_color: z.string().regex(/^[0-9a-fA-F]{6}$/).optional(),
  animation_url: z.string().startsWith('ipfs://').optional(),
  youtube_url: z.string().url().optional(),
  attributes: z.array(AttributeSchema).optional(),
});

export function validateMetadata(metadata: unknown): ERC721Metadata {
  return MetadataSchema.parse(metadata);
}
```

### 2. Immutable Metadata

```typescript
// Ensure metadata is immutable by uploading to IPFS
export async function createImmutableMetadata(
  metadata: ERC721Metadata
): Promise<string> {
  // Validate before upload
  validateMetadata(metadata);
  
  // Upload to IPFS (content-addressed, immutable)
  const ipfsUri = await uploadCertificateMetadata(metadata);
  
  // Verify upload
  const httpUrl = ipfsToHttp(ipfsUri);
  const response = await fetch(httpUrl);
  const uploaded = await response.json();
  
  // Ensure uploaded data matches original
  if (JSON.stringify(uploaded) !== JSON.stringify(metadata)) {
    throw new Error('Metadata verification failed');
  }
  
  return ipfsUri;
}
```

### 3. Privacy Considerations

```typescript
// Omit sensitive information from public metadata
export function sanitizeMetadata(
  metadata: ERC721Metadata,
  includeStudentName: boolean = false
): ERC721Metadata {
  const sanitized = { ...metadata };
  
  if (!includeStudentName && sanitized.attributes) {
    sanitized.attributes = sanitized.attributes.filter(
      attr => attr.trait_type !== 'Student Name'
    );
  }
  
  return sanitized;
}
```

### 4. Metadata Caching

```typescript
// Cache metadata to reduce IPFS gateway requests
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export async function getCachedMetadata(
  tokenUri: string
): Promise<ERC721Metadata | null> {
  const cached = await redis.get(`metadata:${tokenUri}`);
  return cached as ERC721Metadata | null;
}

export async function cacheMetadata(
  tokenUri: string,
  metadata: ERC721Metadata
): Promise<void> {
  await redis.set(`metadata:${tokenUri}`, metadata, {
    ex: 86400 * 7, // 7 days TTL
  });
}
```

### 5. Metadata Updates (Mutable Wrapper Pattern)

```typescript
// For cases where metadata needs to be updatable
// Use a mutable wrapper that points to immutable IPFS content

interface MutableMetadataWrapper {
  version: number;
  currentMetadataUri: string; // ipfs://...
  previousVersions: Array<{
    version: number;
    metadataUri: string;
    timestamp: number;
  }>;
}

export async function updateMetadata(
  currentWrapper: MutableMetadataWrapper,
  newMetadata: ERC721Metadata
): Promise<MutableMetadataWrapper> {
  // Upload new metadata to IPFS
  const newMetadataUri = await uploadCertificateMetadata(newMetadata);
  
  // Create new wrapper version
  return {
    version: currentWrapper.version + 1,
    currentMetadataUri: newMetadataUri,
    previousVersions: [
      ...currentWrapper.previousVersions,
      {
        version: currentWrapper.version,
        metadataUri: currentWrapper.currentMetadataUri,
        timestamp: Date.now(),
      },
    ],
  };
}
```

---

## References

- [ERC-721 Metadata Standard](https://eips.ethereum.org/EIPS/eip-721)
- [OpenSea Metadata Standards](https://docs.opensea.io/docs/metadata-standards)
- [ERC-7160 Multi-Metadata](https://eips.ethereum.org/EIPS/eip-7160)
- [IPFS Best Practices](https://docs.ipfs.tech/concepts/best-practices/)
- [NFT Metadata Best Practices](https://docs.opensea.io/docs/metadata-standards#best-practices)
