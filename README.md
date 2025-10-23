# EduProof – Blockchain Academic Certification Platform

**AI:** Gemini 2.5 Flash | **Chain:** CodeNut DevNet | **Storage:** IPFS | **Built with** CodeNut

🎓 Tamper-proof, AI-verified credentials minted as NFTs in under 60 seconds.

---

## Table of Contents

- [Overview](#overview)
- [Architecture Overview](#architecture-overview)
- [AI Validation (Production Feature)](#ai-validation-production-feature)
- [Why It Matters](#why-it-matters)
- [Features](#features)
- [Key Capabilities](#key-capabilities)
- [Web3 + AI Tech Stack](#web3--ai-tech-stack)
- [Model](#model)
- [Environment Variables](#environment-variables)
- [Hackathon Demo Checklist](#hackathon-demo-checklist)
- [End-to-End Test (Screenshots)](#end-to-end-test-screenshots)
- [How to Test AI Validation](#how-to-test-ai-validation)
- [Setup & Deployment](#setup--deployment)
- [DevNet Status](#devnet-status)
- [Milestones & Roadmap](#milestones--roadmap)
- [Real-World Impact](#real-world-impact)
- [CodeNut Platform Utilization](#codenut-platform-utilization)
- [Hackathon Statement](#hackathon-statement)
- [Demo Video](#demo-video)
- [Team & Contact](#team--contact)

---

## Overview

EduProof secures academic certificates by turning them into tamper-proof NFTs stored on IPFS. Using **CodeNut DevNet** and **Gemini 2.5 Flash AI**, it ensures instant, reliable verification for students, institutions, and employers. Built end-to-end on CodeNut Vibe Coding stack, the platform delivers a production-grade workflow from upload to verification scan.

---

## Architecture Overview

```
User -> Frontend (React) -> API
               |-> Gemini 2.5 Flash (OCR + fraud detection)
               |-> Smart Contract (Solidity / CodeNut DevNet)
               |-> IPFS (certificate storage)
               |-> Supabase (index & search)
```

---

## AI Validation (Production Feature)

EduProof integrates **Gemini 2.5 Flash (latest)** for AI-powered document validation. The AI performs OCR, fraud detection, and on-chain metadata matching in real-time.

### Pipeline

1. User uploads PDF → hashed (SHA-256) + sent to IPFS
2. Gemini 2.5 Flash extracts key fields (Name, Course, Institution, Date)
3. Validates consistency and compares to NFT metadata
4. Detects tampering, mismatches, or missing data
5. Returns JSON verdict with score and issue list

### Sample Output

```json
{
  "verdict": "verified",
  "score": 94,
  "matches": {
    "student": true,
    "course": true,
    "institution": true,
    "date": true
  },
  "chain": {
    "network": "CodeNut DevNet",
    "tokenId": "123",
    "tx": "0x..."
  },
  "issues": []
}
```

---

## Why It Matters

- 🛡️ **Prevents diploma fraud**
- ⚡ **Instant AI validation**
- 🔗 **End-to-end traceability** (IPFS ↔ NFT ↔ Blockchain)
- 💰 **Zero gas fees** on CodeNut DevNet

---

## Features

- ✅ Mint academic certificates as NFTs
- ✅ IPFS decentralized storage
- ✅ AI-powered validation using Gemini 2.5 Flash
- ✅ On-chain verification (CodeNut DevNet)
- ✅ Admin panel for authorized issuers
- ✅ Zero transaction fees

---

## Key Capabilities

| Feature | What Happens | Why it Matters |
|---------|-------------|----------------|
| **One-click certificate minting** | React dApp orchestrates wallet sign-in and ERC-721 mint on DevNet | Delivers auditable, ownership-bound credentials issued in under a minute |
| **AI-assisted validation** | Gemini 2.5 Flash auto-extracts and cross-checks certificate data | Prevents clerical errors and fraud before anything hits the blockchain |
| **IPFS permanence** | Files and metadata pinned with redundant gateways | Guarantees long-term access to original documents without centralized risk |
| **Supabase index & APIs** | Institution dashboard, analytics, and QR verification endpoints | Enables instant verification for employers and regulators via web or API |
| **Admin governance** | Institution registry with revoke and restore controls | Keeps credential issuance under trusted, auditable oversight |

---

## Web3 + AI Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| **Smart Contracts** | EduProofCertificate.sol (`0x742d35Cc6634C0532925a3b844Bc9e7595f0bfbE`), InstitutionRegistry.sol (`0x09635F643e140090A9A8Dcd712eD6285858ceBef`) | Role-gated ERC-721 issuance and institution management on CodeNut DevNet |
| **AI Services** | Gemini 2.5 Flash via CodeNut Vibe Coding runtime | Streams OCR, fraud heuristics, and metadata validation in real time |
| **Storage & Data** | IPFS (Pinata), Supabase Postgres + RLS | Content-addressed storage plus searchable off-chain index |
| **Frontend** | React 18, TypeScript, Tailwind, RainbowKit, Wagmi | Progressive onboarding flow with wallet support and live mint status |
| **Backend** | Node.js API, Ethers.js, Foundry toolchain | Handles file hashing, AI orchestration, and contract transactions |

⚙️ **Tech Stack:** React / Next.js · Solidity · Hardhat · IPFS · Supabase · MetaMask · Gemini 2.5 Flash · CodeNut (Vibe Coding)

---

## Model

**Gemini 2.5 Flash (latest)** by Google – used for OCR, semantic analysis, and fraud detection.

---

## Environment Variables

⚙️ Configure these before running locally or deploying.

```bash
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.5-flash
VITE_CHAIN=devnet
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
```

---

## Hackathon Demo Checklist

- ✅ Walk jurors through uploading a sample PDF and watch Gemini flag corrections in real time.
- ✅ Show the DevNet transaction on-chain plus the matching NFT metadata stored on IPFS.
- ✅ Scan the verification QR to fetch Supabase-backed JSON proof and Gemini validation score.
- ✅ Highlight admin revoke and reissue flow to prove governance and compliance readiness.
- ✅ Close with the student wallet view that displays ownership and transfer history.

---

## End-to-End Test (Screenshots)

| Step | Screenshot | Description |
|------|-----------|-------------|
| 1. Home | Home | Connect MetaMask |
| 2. Mint Certificate | Mint Certificate | Fill form + upload PDF |
| 3. Success | Success | Blockchain confirmation |
| 4. My Certificates | My Certificates | NFT overview |
| 5. Verify | Verify | AI validation ✓ Verified |

---

## How to Test AI Validation

1. Mint a certificate with `demo.pdf`.
2. Open **Verify**, upload the same PDF, and click **AI Validate**.
3. Observe `verdict=verified` and `score > 90`.
4. Modify a field in the PDF, re-run validation, and watch the score drop with issues listed.

---

## Setup & Deployment

```bash
git clone https://github.com/Walid-Khalfa/EduProof
cd EduProof
npm install
cp .env.example .env
npm run dev
```

### Deployed on CodeNut Preview Domain

**Live demo:** https://preview-dd6a73f5-6622-48d5-bbc7-00e416f12c6e.codenut.dev

- ✅ Entièrement opérationnelle sur **CodeNut DevNet** (le message WalletConnect 400 est attendu et sans impact).
- ✅ Transactions instantanées avec **zéro frais de gas**

---

## DevNet Status

ℹ️ **Note navigateur :** le message `ERR_ABORTED: Requête HEAD annulée` est attendu et n'impacte pas l'expérience utilisateur.

- ✅ Contrats déployés sur **CodeNut DevNet** (chainId 20258)
- ✅ Frontend configuré pour DevNet (`VITE_CHAIN=devnet`)
- ✅ Backend synchronisé avec Supabase
- ✅ NFT minting, IPFS et validation Gemini AI fonctionnels
- ✅ Tests de démo complets réussis
- ✅ Aucune erreur de build ou runtime

**Votre DApp est prête pour le CodeNut Global Vibe 2025 : transactions instantanées et zéro frais de gas.**

---

## Milestones & Roadmap

| Stage | Status | Next Up |
|-------|--------|---------|
| MVP launch on DevNet | ✅ Live with end-to-end mint → verify pipeline | Expand issuer onboarding scripts |
| AI validation v2 | ✅ Gemini 2.5 Flash integrated with scoring | Add explainable AI evidence per field |
| Employer portal | 🚧 Prototype UI ready | Connect ATS webhook and read-only API keys |
| Multi-chain expansion | 🧭 Research | Target Polygon and Base for cost-optimized issuance |

---

## Real-World Impact

Each year, over **200,000 fake academic documents** circulate globally. EduProof eliminates fraud through verifiable, AI-validated blockchain credentials. This enhances trust in education, hiring, and international credential recognition.

---

## CodeNut Platform Utilization

EduProof was built and deployed using **CodeNut's AI-powered Vibe Coding environment**, demonstrating how AI can accelerate dApp development and deployment on blockchain networks with zero gas fees.

---

## Hackathon Statement

This project was developed for the **CodeNut Global Vibe: AI Web3 Hackathon 2025** and showcases how AI (Gemini 2.5 Flash) and blockchain (CodeNut DevNet) can combine to secure academic credentials worldwide.

---

## Demo Video

**Watch the EduProof Demo**

*"EduProof's 4-minute walkthrough shows how the platform creates, verifies, and manages blockchain-secured academic certificates."*

---

## Team & Contact

**Built by Walid Khalfa** – email: khelfawalid@gmail.com

- Connect on LinkedIn: [Walid Khalfa](https://www.linkedin.com/in/walid-khalfa)
- Follow deployments and updates on the DevNet contract events and Supabase dashboards.
- Looking for pilot universities, edtech partners, and hiring consortiums to co-create the next milestones.

---

**EduProof pairs AI vigilance with Web3 permanence so every learner can prove achievements anywhere, instantly.**
