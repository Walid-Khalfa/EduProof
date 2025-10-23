# EduProof dApp Development Documentation

## Overview

This documentation provides comprehensive guides for building the EduProof decentralized application (dApp) for educational certificate management using NFTs.

---

## 📚 Documentation Index

### 1. [Next.js 14 App Router Best Practices](./nextjs-app-router-guide.md)
Learn how to structure your Next.js 14 application with the App Router, including:
- API routes vs Server Actions
- Server-side vs Client-side component patterns
- Environment variable handling (server-only vs public)
- Project structure and organization
- Security best practices

**Key Topics:**
- When to use Server Actions vs API Routes
- Protecting sensitive data with server-only variables
- Hybrid rendering patterns for optimal performance
- Form handling with Server Actions
- Rate limiting and authentication

---

### 2. [Pinata IPFS Integration](./pinata-ipfs-integration.md)
Complete guide to integrating Pinata for decentralized file storage:
- File upload implementation (pinFileToIPFS)
- JSON metadata upload (pinJSONToIPFS)
- Secure JWT authentication (server-side only)
- File validation and size limits
- Gateway usage best practices

**Key Topics:**
- Secure API key management
- File size limits and validation (100MB public, 1GB authenticated)
- Dedicated vs public gateways
- Caching and performance optimization
- Error handling and retry logic

---

### 3. [AI-OCR Integration](./ai-ocr-integration.md)
Comprehensive guide to AI-powered certificate text extraction:
- OpenAI Vision API for certificate OCR
- Alternative services (Tesseract.js, Google Vision, AWS Textract)
- Confidence scoring implementation
- Field extraction patterns for certificates
- Service comparison and recommendations

**Key Topics:**
- Structured field extraction with GPT-4 Vision
- Pattern-based text extraction
- Confidence thresholds and validation
- Multi-service consensus approach
- Cost optimization strategies

---

### 4. [Web3 Wallet Integration](./web3-wallet-integration.md)
Complete guide to wallet integration with RainbowKit and Wagmi:
- RainbowKit setup with Next.js 14
- Multi-chain configuration (Polygon Amoy, Sepolia, Base Sepolia)
- Wagmi hooks for contract interactions
- Wallet connection UX best practices
- Error handling and transaction management

**Key Topics:**
- WalletConnect configuration
- Custom chain setup
- Protected routes and authentication
- Contract read/write operations
- Gas estimation and transaction notifications

---

### 5. [NFT Metadata Standards](./nft-metadata-standards.md)
Standards and best practices for NFT metadata:
- ERC-721 metadata schema
- OpenSea metadata requirements
- IPFS URI formatting (ipfs:// vs https://)
- Certificate-specific attributes and traits
- Metadata validation and immutability

**Key Topics:**
- Standard metadata structure
- OpenSea display types and special fields
- IPFS URI best practices
- Certificate attribute patterns
- Privacy considerations

---

## 🚀 Quick Start Guide

### Prerequisites

Before starting development, ensure you have:

1. **Node.js 18+** installed
2. **Next.js 14** project set up
3. **Pinata account** with JWT token
4. **WalletConnect Project ID**
5. **OpenAI API key** (for OCR features)

### Environment Setup

Create a `.env.local` file with the following variables:

```bash
# Server-Only Variables (NEVER expose to client)
PINATA_JWT=your_pinata_jwt_token
OPENAI_API_KEY=sk-your_openai_api_key

# Public Variables (exposed to client)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
NEXT_PUBLIC_INSTITUTION_REGISTRY_ADDRESS=0xd0c5FFab4A8265b83f5785629248F3bd3c5cd11d
NEXT_PUBLIC_CERTIFICATE_ADDRESS=0x0fEFa8D515BF472352d8fFDbC0846bae39faaB82
NEXT_PUBLIC_DEFAULT_CHAIN_ID=80002
```

### Installation

```bash
# Install core dependencies
npm install @rainbow-me/rainbowkit wagmi viem@2.x @tanstack/react-query

# Install IPFS utilities
npm install axios form-data

# Install AI/OCR (choose one or more)
npm install openai                    # OpenAI Vision
npm install tesseract.js              # Tesseract.js
npm install @google-cloud/vision      # Google Cloud Vision
npm install @aws-sdk/client-textract  # AWS Textract

# Install validation
npm install zod

# Install UI components (if using shadcn/ui)
npx shadcn-ui@latest init
```

### Project Structure

```
app/
├── (auth)/              # Authentication pages
├── (dashboard)/         # Dashboard pages
├── api/                 # API routes
│   ├── upload/         # IPFS upload endpoints
│   └── ocr/            # OCR processing endpoints
├── actions/            # Server actions
├── providers.tsx       # Web3 providers
└── layout.tsx          # Root layout

lib/
├── contracts/          # Contract ABIs and addresses
├── ipfs/              # IPFS utilities
├── ocr/               # OCR utilities
├── metadata/          # NFT metadata builders
└── wagmi/             # Wagmi configuration

components/
├── wallet/            # Wallet components
├── certificates/      # Certificate components
└── ui/               # UI components
```

---

## 🔑 Key Concepts

### 1. Server-Side Security

**Always keep sensitive data server-side:**
- API keys (Pinata JWT, OpenAI API key)
- Private keys
- Database credentials

**Use server-only environment variables:**
```typescript
// ❌ WRONG - Exposed to client
const jwt = process.env.NEXT_PUBLIC_PINATA_JWT;

// ✅ CORRECT - Server-only
const jwt = process.env.PINATA_JWT;
```

### 2. IPFS Best Practices

**Always use `ipfs://` protocol in metadata:**
```json
{
  "image": "ipfs://QmXxxx.../certificate.pdf",
  "animation_url": "ipfs://QmYyyy.../video.mp4"
}
```

**Never hardcode gateway URLs:**
```typescript
// ❌ WRONG
const url = "https://ipfs.io/ipfs/QmXxxx...";

// ✅ CORRECT
const ipfsUri = "ipfs://QmXxxx...";
const url = ipfsToHttp(ipfsUri); // Convert when needed
```

### 3. Multi-Chain Support

**Use chain-specific contract addresses:**
```typescript
const CONTRACT_ADDRESSES = {
  [polygonAmoy.id]: {
    certificate: '0x...',
  },
  [sepolia.id]: {
    certificate: '0x...',
  },
};
```

**Always check chain compatibility:**
```typescript
const { chainId } = useChainId();
const isSupported = SUPPORTED_CHAINS.includes(chainId);
```

### 4. Metadata Immutability

**Upload to IPFS for immutable storage:**
```typescript
// Metadata is content-addressed and immutable
const metadataUri = await uploadCertificateMetadata(metadata);
// Returns: ipfs://QmZzzz.../metadata.json
```

**Validate before upload:**
```typescript
validateMetadata(metadata); // Throws if invalid
const uri = await uploadCertificateMetadata(metadata);
```

---

## 🛠️ Development Workflow

### 1. Certificate Upload Flow

```typescript
// 1. Upload certificate file to IPFS
const fileUri = await uploadFile(certificateFile);

// 2. Extract text with OCR (optional)
const extractedData = await extractCertificateFields(certificateFile);

// 3. Build metadata
const metadata = buildCertificateMetadata({
  name: extractedData.degree,
  description: `Certificate for ${extractedData.studentName}`,
  imageUri: fileUri,
  traits: extractedData,
});

// 4. Upload metadata to IPFS
const metadataUri = await uploadCertificateMetadata(metadata);

// 5. Mint NFT with metadata URI
await mintCertificate(studentAddress, metadataUri, studentHash);
```

### 2. Certificate Verification Flow

```typescript
// 1. Read certificate status from contract
const status = await readContract({
  address: certificateAddress,
  abi: CERTIFICATE_ABI,
  functionName: 'status',
  args: [tokenId],
});

// 2. Fetch metadata from IPFS
const metadataUri = await readContract({
  address: certificateAddress,
  abi: CERTIFICATE_ABI,
  functionName: 'tokenURI',
  args: [tokenId],
});

const metadata = await fetch(ipfsToHttp(metadataUri)).then(r => r.json());

// 3. Verify student identity (privacy-preserving)
const storedHash = await readContract({
  address: certificateAddress,
  abi: CERTIFICATE_ABI,
  functionName: 'getStudentHash',
  args: [tokenId],
});

const claimedHash = keccak256(toUtf8Bytes(studentName));
const isValid = storedHash === claimedHash;
```

---

## 📊 Service Comparison

### OCR Services

| Service | Accuracy | Cost | Best For |
|---------|----------|------|----------|
| OpenAI Vision | ~2.5% WER | ~$0.01/image | Structured extraction |
| Google Cloud Vision | 2.0% WER | $1.50/1K images | Highest accuracy |
| AWS Textract | 2.8% WER | $0.05/page | Form extraction |
| Tesseract.js | 5.8% WER | Free | Client-side, privacy |

### IPFS Gateways

| Gateway | Type | Speed | Reliability |
|---------|------|-------|-------------|
| Pinata Dedicated | Paid | Fast | High |
| Pinata Public | Free | Medium | Medium |
| IPFS.io | Public | Slow | Low |
| Cloudflare | Public | Fast | Medium |

---

## 🔒 Security Checklist

- [ ] API keys stored in server-only environment variables
- [ ] Input validation on all user inputs (use Zod)
- [ ] Rate limiting on API routes
- [ ] Authentication checks in Server Actions
- [ ] IPFS URIs use `ipfs://` protocol
- [ ] Metadata validated before upload
- [ ] Contract addresses verified for each chain
- [ ] Error messages don't expose sensitive data
- [ ] File size limits enforced (client and server)
- [ ] CORS configured properly for API routes

---

## 🧪 Testing Recommendations

### Unit Tests
- Metadata validation functions
- IPFS URI conversion utilities
- OCR field extraction patterns
- Contract interaction hooks

### Integration Tests
- File upload flow (client → API → IPFS)
- OCR extraction flow (file → OCR → validation)
- Certificate minting flow (metadata → IPFS → contract)
- Multi-chain switching

### E2E Tests
- Complete certificate creation workflow
- Certificate verification workflow
- Wallet connection and network switching
- Error handling and edge cases

---

## 📖 Additional Resources

### Smart Contracts
- [EduProof Contracts Documentation](../contracts/README.md)
- [Deployment Guide](../contracts/DEPLOYMENT.md)
- [Contract ABIs](../contracts/interfaces/metadata.json)

### External Documentation
- [Next.js 14 Documentation](https://nextjs.org/docs)
- [RainbowKit Documentation](https://www.rainbowkit.com/docs)
- [Wagmi Documentation](https://wagmi.sh/)
- [Pinata Documentation](https://docs.pinata.cloud/)
- [OpenAI Vision API](https://platform.openai.com/docs/guides/vision)
- [OpenSea Metadata Standards](https://docs.opensea.io/docs/metadata-standards)

### Community
- [EduProof GitHub](https://github.com/your-repo)
- [Discord Community](https://discord.gg/your-server)
- [Twitter](https://twitter.com/your-handle)

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](../CONTRIBUTING.md) for details.

### Development Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env.local`
4. Fill in environment variables
5. Run development server: `npm run dev`

### Code Style

- Use TypeScript for type safety
- Follow ESLint configuration
- Write tests for new features
- Document complex logic
- Use meaningful variable names

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.

---

## 🆘 Support

Need help? Here's how to get support:

1. **Documentation**: Check the guides above
2. **GitHub Issues**: [Report bugs or request features](https://github.com/your-repo/issues)
3. **Discord**: [Join our community](https://discord.gg/your-server)
4. **Email**: support@eduproof.app

---

**Last Updated**: 2024
**Version**: 1.0.0
