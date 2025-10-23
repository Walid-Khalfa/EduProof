# Next.js 14 App Router Best Practices for EduProof

## Overview

This guide covers Next.js 14 App Router best practices for building the EduProof dApp, including API routes structure, server-side vs client-side patterns, and environment variable handling.

---

## Table of Contents

1. [API Routes vs Server Actions](#api-routes-vs-server-actions)
2. [Server-Side vs Client-Side Components](#server-side-vs-client-side-components)
3. [Environment Variables](#environment-variables)
4. [Project Structure](#project-structure)
5. [Code Examples](#code-examples)

---

## API Routes vs Server Actions

### When to Use API Routes

**Use API Routes for:**
- External webhooks (e.g., Pinata callbacks)
- Third-party integrations
- Public REST endpoints
- External client access (mobile apps, etc.)

**Location:** `app/api/[route]/route.ts`

### When to Use Server Actions

**Use Server Actions for:**
- Form submissions
- Internal mutations (certificate minting, institution registration)
- Data operations within the same app
- Direct server-side logic in components

**Location:** Colocated with components or in dedicated `actions.ts` files

### Comparison Table

| Use Case | Server Actions | API Route |
|----------|:-------------:|:---------:|
| Form submissions | ✅ | |
| Internal mutations | ✅ | |
| Reading data | ⚡ (future) | ✅ |
| 3rd-party webhooks | | ✅ |
| External clients | | ✅ |

---

## Server-Side vs Client-Side Components

### Server Components (Default)

**Benefits:**
- Zero JavaScript sent to client
- Direct database/API access
- Better SEO
- Faster initial page load

**Use for:**
- Data fetching
- Static content
- Layout components
- Certificate display (read-only)

```tsx
// app/certificates/[id]/page.tsx
// Server Component (default)
import { getCertificate } from '@/lib/contracts';

export default async function CertificatePage({ 
  params 
}: { 
  params: { id: string } 
}) {
  const certificate = await getCertificate(params.id);
  
  return (
    <div>
      <h1>{certificate.name}</h1>
      <p>{certificate.description}</p>
    </div>
  );
}
```

### Client Components

**Use for:**
- Interactive UI (buttons, forms)
- Browser APIs (localStorage, window)
- Event handlers
- Wallet connections
- Real-time updates

```tsx
'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';

export default function MintCertificateForm() {
  const [loading, setLoading] = useState(false);
  const { address } = useAccount();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Minting logic
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
    </form>
  );
}
```

### Hybrid Pattern (Recommended)

Combine server and client components for optimal performance:

```tsx
// app/dashboard/page.tsx (Server Component)
import { getInstitutionData } from '@/lib/contracts';
import MintForm from './MintForm'; // Client Component

export default async function DashboardPage() {
  const institutionData = await getInstitutionData();
  
  return (
    <div>
      <h1>Institution Dashboard</h1>
      <MintForm institutionData={institutionData} />
    </div>
  );
}
```

---

## Environment Variables

### Server-Only Variables

**Naming:** No `NEXT_PUBLIC_` prefix

**Use for:**
- API keys (Pinata JWT, OpenAI API key)
- Database credentials
- Private keys (NEVER commit these)
- Secrets

```bash
# .env.local (NEVER commit this file)
PINATA_JWT=your_jwt_token_here
OPENAI_API_KEY=sk-...
DATABASE_URL=postgresql://...
PRIVATE_KEY=0x...
```

**Access (Server-side only):**

```tsx
// app/api/upload/route.ts
export async function POST(request: Request) {
  const pinataJWT = process.env.PINATA_JWT;
  
  if (!pinataJWT) {
    throw new Error('PINATA_JWT not configured');
  }
  
  // Use JWT for Pinata API calls
}
```

### Public Variables

**Naming:** Must start with `NEXT_PUBLIC_`

**Use for:**
- Public API endpoints
- Analytics IDs
- Feature flags
- Chain IDs
- Contract addresses (public info)

```bash
# .env.local
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
NEXT_PUBLIC_INSTITUTION_REGISTRY_ADDRESS=0x...
NEXT_PUBLIC_CERTIFICATE_ADDRESS=0x...
NEXT_PUBLIC_CHAIN_ID=80002
```

**Access (Client or Server):**

```tsx
'use client';

export default function WalletProvider({ children }) {
  const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
  
  return (
    <WagmiProvider config={config}>
      {children}
    </WagmiProvider>
  );
}
```

### Environment File Priority

```
.env.local > .env.development / .env.production > .env
```

**Best Practices:**
1. Use `.env.local` for sensitive, local-only settings
2. Commit `.env.example` with placeholder values
3. Never commit `.env.local` or any file with real secrets
4. Restart dev server after changing environment variables

### Example .env.example

```bash
# Public Variables (exposed to client)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
NEXT_PUBLIC_INSTITUTION_REGISTRY_ADDRESS=0x...
NEXT_PUBLIC_CERTIFICATE_ADDRESS=0x...
NEXT_PUBLIC_CHAIN_ID=80002

# Server-Only Variables (NEVER exposed to client)
PINATA_JWT=your_pinata_jwt_token
OPENAI_API_KEY=sk-your_openai_api_key
DATABASE_URL=postgresql://user:password@localhost:5432/eduproof
```

---

## Project Structure

### Recommended App Router Structure

```
app/
├── (auth)/                    # Route group for auth pages
│   ├── login/
│   │   └── page.tsx
│   └── register/
│       └── page.tsx
├── (dashboard)/               # Route group for dashboard
│   ├── layout.tsx            # Shared dashboard layout
│   ├── page.tsx              # Dashboard home
│   ├── certificates/
│   │   ├── page.tsx          # List certificates
│   │   ├── [id]/
│   │   │   └── page.tsx      # Certificate detail
│   │   └── mint/
│   │       ├── page.tsx      # Mint form (server)
│   │       └── MintForm.tsx  # Client component
│   └── institutions/
│       └── page.tsx
├── api/                       # API routes
│   ├── upload/
│   │   └── route.ts          # IPFS upload endpoint
│   ├── ocr/
│   │   └── route.ts          # OCR processing
│   └── webhooks/
│       └── pinata/
│           └── route.ts
├── actions/                   # Server actions
│   ├── certificates.ts
│   └── institutions.ts
├── layout.tsx                 # Root layout
└── page.tsx                   # Home page

lib/
├── contracts/                 # Contract interactions
│   ├── certificate.ts
│   └── registry.ts
├── ipfs/
│   └── pinata.ts
├── ocr/
│   └── openai.ts
└── utils/
    └── validation.ts

components/
├── ui/                        # shadcn components
├── wallet/
│   └── WalletProvider.tsx
└── certificates/
    ├── CertificateCard.tsx
    └── CertificateList.tsx
```

---

## Code Examples

### 1. Server Action for Certificate Minting

```tsx
// app/actions/certificates.ts
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const mintSchema = z.object({
  studentAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  studentName: z.string().min(1),
  tokenURI: z.string().url(),
});

export async function mintCertificate(formData: FormData) {
  // Validate input
  const data = mintSchema.parse({
    studentAddress: formData.get('studentAddress'),
    studentName: formData.get('studentName'),
    tokenURI: formData.get('tokenURI'),
  });
  
  // Check authentication
  const session = await getServerSession();
  if (!session?.user?.institutionAddress) {
    throw new Error('Unauthorized');
  }
  
  // Calculate student hash
  const studentHash = keccak256(toUtf8Bytes(data.studentName));
  
  // Mint certificate (contract interaction)
  const tx = await mintCertificateOnChain({
    to: data.studentAddress,
    tokenURI: data.tokenURI,
    studentHash,
  });
  
  // Revalidate the certificates page
  revalidatePath('/dashboard/certificates');
  
  return { success: true, txHash: tx.hash };
}
```

### 2. API Route for IPFS Upload

```tsx
// app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import FormData from 'form-data';

export async function POST(request: NextRequest) {
  try {
    // Get JWT from environment (server-only)
    const pinataJWT = process.env.PINATA_JWT;
    
    if (!pinataJWT) {
      return NextResponse.json(
        { error: 'IPFS service not configured' },
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
    
    // Validate file size (100MB limit)
    const MAX_SIZE = 100 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Max size: 100MB' },
        { status: 400 }
      );
    }
    
    // Upload to Pinata
    const pinataFormData = new FormData();
    const buffer = Buffer.from(await file.arrayBuffer());
    pinataFormData.append('file', buffer, file.name);
    
    const response = await axios.post(
      'https://api.pinata.cloud/pinning/pinFileToIPFS',
      pinataFormData,
      {
        headers: {
          ...pinataFormData.getHeaders(),
          Authorization: `Bearer ${pinataJWT}`,
        },
      }
    );
    
    return NextResponse.json({
      success: true,
      ipfsHash: response.data.IpfsHash,
      ipfsUrl: `ipfs://${response.data.IpfsHash}`,
    });
    
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    );
  }
}

// Specify runtime (optional, for edge deployment)
export const runtime = 'nodejs'; // or 'edge'
```

### 3. Client Component with Server Action

```tsx
'use client';

// app/dashboard/certificates/mint/MintForm.tsx
import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { mintCertificate } from '@/app/actions/certificates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function SubmitButton() {
  const { pending } = useFormStatus();
  
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Minting...' : 'Mint Certificate'}
    </Button>
  );
}

export default function MintForm() {
  const [error, setError] = useState<string | null>(null);
  
  async function handleSubmit(formData: FormData) {
    try {
      setError(null);
      const result = await mintCertificate(formData);
      
      if (result.success) {
        // Show success message
        alert(`Certificate minted! TX: ${result.txHash}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Minting failed');
    }
  }
  
  return (
    <form action={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="studentAddress">Student Address</label>
        <Input
          id="studentAddress"
          name="studentAddress"
          placeholder="0x..."
          required
        />
      </div>
      
      <div>
        <label htmlFor="studentName">Student Name</label>
        <Input
          id="studentName"
          name="studentName"
          placeholder="John Doe"
          required
        />
      </div>
      
      <div>
        <label htmlFor="tokenURI">Token URI</label>
        <Input
          id="tokenURI"
          name="tokenURI"
          placeholder="ipfs://..."
          required
        />
      </div>
      
      {error && (
        <div className="text-red-500 text-sm">{error}</div>
      )}
      
      <SubmitButton />
    </form>
  );
}
```

### 4. Edge Runtime API Route

```tsx
// app/api/verify/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge'; // Deploy to edge for low latency

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenId = searchParams.get('tokenId');
  
  if (!tokenId) {
    return NextResponse.json(
      { error: 'Token ID required' },
      { status: 400 }
    );
  }
  
  // Verify certificate (lightweight operation)
  const isValid = await verifyCertificate(tokenId);
  
  return NextResponse.json({
    tokenId,
    isValid,
    timestamp: Date.now(),
  });
}
```

---

## Security Best Practices

### 1. Input Validation

Always validate user input in Server Actions:

```tsx
import { z } from 'zod';

const schema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  amount: z.number().positive(),
});

export async function serverAction(data: unknown) {
  const validated = schema.parse(data); // Throws if invalid
  // Safe to use validated data
}
```

### 2. Authentication Checks

```tsx
'use server';

import { getServerSession } from 'next-auth';

export async function protectedAction() {
  const session = await getServerSession();
  
  if (!session?.user) {
    throw new Error('Unauthorized');
  }
  
  // Check role/permissions
  if (!session.user.hasInstitutionRole) {
    throw new Error('Insufficient permissions');
  }
  
  // Proceed with action
}
```

### 3. Rate Limiting

```tsx
// app/api/upload/route.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 requests per minute
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
  
  // Process request
}
```

---

## Performance Optimization

### 1. Streaming and Suspense

```tsx
// app/certificates/page.tsx
import { Suspense } from 'react';
import CertificateList from './CertificateList';
import CertificateSkeleton from './CertificateSkeleton';

export default function CertificatesPage() {
  return (
    <div>
      <h1>Certificates</h1>
      <Suspense fallback={<CertificateSkeleton />}>
        <CertificateList />
      </Suspense>
    </div>
  );
}
```

### 2. Parallel Data Fetching

```tsx
// Server Component
export default async function DashboardPage() {
  // Fetch in parallel
  const [certificates, institutions, stats] = await Promise.all([
    getCertificates(),
    getInstitutions(),
    getStats(),
  ]);
  
  return (
    <div>
      <Stats data={stats} />
      <Certificates data={certificates} />
      <Institutions data={institutions} />
    </div>
  );
}
```

### 3. Revalidation Strategies

```tsx
// Static with revalidation
export const revalidate = 3600; // Revalidate every hour

// Dynamic
export const dynamic = 'force-dynamic';

// Programmatic revalidation
import { revalidatePath, revalidateTag } from 'next/cache';

export async function updateCertificate() {
  // Update data
  revalidatePath('/certificates');
  revalidateTag('certificates');
}
```

---

## References

- [Next.js 14 Documentation](https://nextjs.org/docs)
- [Server Actions Guide](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions)
- [API Routes in App Router](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
