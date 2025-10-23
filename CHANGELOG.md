# Changelog

## [Unreleased] - Token ID Exposure & UX Improvements

### Added
- **Token ID Visibility**: Token ID now prominently displayed across the application
  - Success modal shows Token ID with copy button and direct Etherscan NFT link
  - My Certificates page displays Token ID in certificate cards with copy functionality
  - Verify page supports verification by Token ID (contract + tokenId)
  - URL parameter support: `/verify?tokenId=123` for direct verification links

- **New UI Components**:
  - `CopyField.tsx`: Reusable component for displaying copyable values with optional links
  - `EtherscanLink.tsx`: Multi-chain explorer link generator with support for transactions, addresses, and NFTs

- **Enhanced Clipboard Support**:
  - Robust clipboard copy with automatic fallback (navigator.clipboard → execCommand)
  - Works across all browsers including older versions and non-HTTPS contexts
  - Toast notifications for copy success/failure

- **Popup Blocker Handling**:
  - "Open All Links" feature now detects blocked popups
  - User-friendly error message with instructions to allow popups
  - Returns count of successfully opened tabs

### Changed
- **Backend API**: `/api/certificates/verify` now accepts `contract` + `tokenId` parameters for token-based verification
- **Success Modal**: Reorganized to show On-Chain Information section with Token ID and Contract Address
- **My Certificates**: Replaced individual link buttons with integrated CopyField components showing Token ID and Transaction hash
- **Verify Page**: Enabled Token ID search tab (previously disabled) with helper text and auto-fill from URL params

### Technical Improvements
- Token ID fetched from backend after minting via `/api/certificates/verify?txHash=...`
- Multi-chain explorer URL generation supporting Ethereum, Polygon, Base, Arbitrum, Optimism, and testnets
- Shortened address display for better UX (e.g., `0x1234...5678`)
- Monospace font for blockchain addresses and hashes

### Documentation
- Updated DEMO_SCRIPT.md with Token ID copy demonstrations
- Added CHANGELOG.md to track feature additions and improvements

---

## Previous Versions

See git history for changes prior to this release.
