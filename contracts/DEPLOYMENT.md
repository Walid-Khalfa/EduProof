# EduProof System Deployment

## Deployed Contracts

### Network: Devnet (Chain ID: 20258)

| Contract | Address |
|----------|---------|
| InstitutionRegistry | `0xd0c5FFab4A8265b83f5785629248F3bd3c5cd11d` |
| EduProofCertificate | `0x0fEFa8D515BF472352d8fFDbC0846bae39faaB82` |

**Deployer Address:** `0x4765263996974Da1c3Ae452C405dba94bb07c05A`

**Factory Transaction:** `0x29d267093c90db89b43272345e0cac127d7cca420ade41985a77926c5876fcd0`

---

## System Overview

The EduProof system consists of two main contracts:

### 1. InstitutionRegistry
Manages educational institutions with role-based access control.

**Key Features:**
- Register and revoke institutions
- Store institution metadata (name, DID URI)
- Track institution active status
- Admin-controlled operations

**Roles:**
- `DEFAULT_ADMIN_ROLE`: Can grant/revoke roles
- `ADMIN_ROLE`: Can register/revoke institutions

### 2. EduProofCertificate
ERC-721 NFT contract for educational certificates with revocation capability.

**Key Features:**
- Mint certificates as NFTs
- Revoke certificates with reason tracking
- Privacy-preserving student identification (hash-based)
- Status tracking (Active/Revoked)

**Roles:**
- `DEFAULT_ADMIN_ROLE`: Can grant/revoke roles
- `INSTITUTION_ROLE`: Can mint certificates

---

## Multi-Chain Deployment Support

The system is designed for deployment across multiple EVM-compatible chains:

### Supported Networks

| Network | Chain ID | RPC URL |
|---------|----------|---------|
| Ethereum Mainnet | 1 | https://eth.llamarpc.com |
| Ethereum Sepolia | 11155111 | https://rpc.sepolia.org |
| Polygon Amoy | 80002 | https://rpc-amoy.polygon.technology |
| Base Sepolia | 84532 | https://sepolia.base.org |
| Arbitrum Sepolia | 421614 | https://sepolia-rollup.arbitrum.io/rpc |
| Optimism Sepolia | 11155420 | https://sepolia.optimism.io |

### Deployment Instructions

To deploy to a specific network:

1. **Set up environment variables** (create `.env` file):
```bash
# Private key for deployment (without 0x prefix)
PRIVATE_KEY=your_private_key_here

# RPC URLs for different networks
ETHEREUM_SEPOLIA_RPC_URL=https://rpc.sepolia.org
POLYGON_AMOY_RPC_URL=https://rpc-amoy.polygon.technology
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
```

2. **Deploy to specific network**:
```bash
# Deploy to Ethereum Sepolia
forge script script/Deploy.s.sol:Deploy --rpc-url $ETHEREUM_SEPOLIA_RPC_URL --broadcast --verify

# Deploy to Polygon Amoy
forge script script/Deploy.s.sol:Deploy --rpc-url $POLYGON_AMOY_RPC_URL --broadcast --verify

# Deploy to Base Sepolia
forge script script/Deploy.s.sol:Deploy --rpc-url $BASE_SEPOLIA_RPC_URL --broadcast --verify
```

3. **Verify contracts** (if not auto-verified):
```bash
forge verify-contract <CONTRACT_ADDRESS> <CONTRACT_NAME> --chain <CHAIN_ID> --watch
```

---

## Usage Guide

### Initial Setup

1. **Grant Admin Role** (InstitutionRegistry):
```solidity
// The deployer already has DEFAULT_ADMIN_ROLE and ADMIN_ROLE
// To grant ADMIN_ROLE to another address:
institutionRegistry.grantRole(ADMIN_ROLE, adminAddress);
```

2. **Register an Institution**:
```solidity
institutionRegistry.registerInstitution(
    institutionAddress,
    "Massachusetts Institute of Technology",
    "did:example:mit123"
);
```

3. **Grant Institution Role** (EduProofCertificate):
```solidity
// Grant INSTITUTION_ROLE to registered institutions
eduProofCertificate.grantRole(INSTITUTION_ROLE, institutionAddress);
```

### Minting Certificates

Institutions can mint certificates to students:

```solidity
// Calculate student hash for privacy
bytes32 studentHash = keccak256(abi.encodePacked("John Doe"));

// Mint certificate
eduProofCertificate.safeMint(
    studentAddress,
    "ipfs://QmXxxx...", // Token URI with certificate metadata
    studentHash
);
```

### Revoking Certificates

Institutions or certificate owners can revoke certificates:

```solidity
eduProofCertificate.revoke(
    tokenId,
    "Certificate revoked due to academic misconduct"
);
```

### Checking Certificate Status

Anyone can check the status of a certificate:

```solidity
string memory status = eduProofCertificate.status(tokenId);
// Returns: "Active" or "Revoked"

// Get detailed revocation information
(bool isRevoked, string memory reason, uint256 timestamp) = 
    eduProofCertificate.getRevocationInfo(tokenId);
```

### Verifying Student Identity

Verify a certificate belongs to a specific student (privacy-preserving):

```solidity
bytes32 claimedHash = keccak256(abi.encodePacked("John Doe"));
bytes32 storedHash = eduProofCertificate.getStudentHash(tokenId);

if (claimedHash == storedHash) {
    // Certificate belongs to this student
}
```

---

## Contract Interactions

### InstitutionRegistry Functions

| Function | Access | Description |
|----------|--------|-------------|
| `registerInstitution(address, string, string)` | ADMIN_ROLE | Register a new institution |
| `revokeInstitution(address)` | ADMIN_ROLE | Revoke an institution's active status |
| `isActive(address)` | Public | Check if institution is active |
| `getInstitution(address)` | Public | Get institution details |
| `getAllInstitutions()` | Public | Get all registered institution addresses |
| `getInstitutionCount()` | Public | Get total number of institutions |

### EduProofCertificate Functions

| Function | Access | Description |
|----------|--------|-------------|
| `safeMint(address, string, bytes32)` | INSTITUTION_ROLE | Mint a new certificate |
| `revoke(uint256, string)` | INSTITUTION_ROLE or Owner | Revoke a certificate |
| `status(uint256)` | Public | Get certificate status |
| `getRevocationInfo(uint256)` | Public | Get revocation details |
| `getStudentHash(uint256)` | Public | Get student hash |
| `totalSupply()` | Public | Get total certificates minted |
| `ownerOf(uint256)` | Public | Get certificate owner |
| `tokenURI(uint256)` | Public | Get certificate metadata URI |

---

## Security Considerations

1. **Role Management**: Only grant `ADMIN_ROLE` and `INSTITUTION_ROLE` to trusted addresses
2. **Private Keys**: Never commit private keys to version control
3. **Student Privacy**: Student names are hashed for privacy protection
4. **Revocation**: Revoked certificates cannot be un-revoked
5. **Access Control**: All sensitive operations are protected by role-based access control

---

## Testing

Run the comprehensive test suite:

```bash
# Run all tests
forge test

# Run with verbosity
forge test -vvv

# Run specific test
forge test --match-test testMintCertificate

# Run with gas reporting
forge test --gas-report

# Run with coverage
forge coverage
```

---

## ABI and Metadata

Contract ABIs and metadata are available in:
- `contracts/out/InstitutionRegistry.sol/InstitutionRegistry.json`
- `contracts/out/EduProofCertificate.sol/EduProofCertificate.json`
- `contracts/interfaces/metadata.json` (auto-generated)

---

## Support and Documentation

For more information:
- [Foundry Documentation](https://book.getfoundry.sh/)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)
- [ERC-721 Standard](https://eips.ethereum.org/EIPS/eip-721)
