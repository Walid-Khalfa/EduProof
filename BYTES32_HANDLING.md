# Bytes32 Handling in EduProof

## Overview

EduProof smart contracts use Solidity `bytes32` type for certificate data hashing and identification. This document explains how bytes32 encoding works and how to troubleshoot common issues.

## What is bytes32?

In Solidity, `bytes32` is a fixed-size byte array of exactly 32 bytes (256 bits). When represented as a hexadecimal string, it appears as:
- `0x` prefix (2 characters)
- 64 hexadecimal characters (each hex char represents 4 bits, so 64 chars = 256 bits = 32 bytes)
- **Total length: 66 characters**

### Valid bytes32 Examples

```
0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890  ✅ (66 chars)
0x24024f8f9c62544dea8e5b1b36a4ceaddfacb445f360f3b36b4709e4d08764fd  ✅ (66 chars)
```

### Invalid bytes32 Examples

```
24024f8f9c62544dea8e5b1b36a4ceaddfacb445f360f3b36b4709e4d08764fd    ❌ Missing 0x prefix
0x1234                                                            ❌ Too short (6 chars)
0x24024f8f9c62544dea8e5b1b36a4ceaddfacb445f360f3b36b4709e4d08764fd00  ❌ Too long (68 chars = bytes33)
```

## Common Error: bytes64 vs bytes32

### Error Message
```
Size of bytes "24024f8f9c6254ddea8e5bfb36a4ceaddfacb445f360f3b36b47..." (bytes64) 
does not match expected size (bytes32).
```

### Root Cause

This error occurs when a 64-character hex string (without `0x` prefix) is passed where a bytes32 is expected. The system interprets each character as a byte instead of a hex digit.

**Example:**
```javascript
// ❌ WRONG: 64 hex chars without 0x = interpreted as 64 bytes
const hash = "24024f8f9c62544dea8e5b1b36a4ceaddfacb445f360f3b36b4709e4d08764fd";

// ✅ CORRECT: Add 0x prefix = interpreted as 32 bytes (64 hex digits)
const hash = "0x24024f8f9c62544dea8e5b1b36a4ceaddfacb445f360f3b36b4709e4d08764fd";
```

## Implementation in EduProof

### File Hash Conversion

The backend computes SHA-256 hashes as 64-character hex strings (no prefix):

```typescript
// server/routes/ipfs.ts
const sha256 = crypto.createHash('sha256').update(req.file.buffer).digest('hex');
// Returns: "24024f8f9c62544dea8e5b1b36a4ceaddfacb445f360f3b36b4709e4d08764fd"
```

The frontend converts this to proper bytes32 format:

```typescript
// src/pages/Index.tsx
import { hexToBytes32, assertBytes32 } from '@/utils/bytes32';

// Convert SHA-256 hex to bytes32
const fileSha256Bytes32 = hexToBytes32(fileSha256);  // Adds 0x prefix
assertBytes32(fileSha256Bytes32);  // Validates format

// Now safe to use in ABI encoding
const idempotencyData = encodeAbiParameters(
  parseAbiParameters('bytes32, address, uint256'),
  [fileSha256Bytes32, address, BigInt(Date.now())]
);
```

### Student Hash Conversion

Student names are hashed using keccak256, which automatically returns proper bytes32:

```typescript
import { keccak256, toBytes } from 'viem';

const studentHash = keccak256(toBytes(studentName));
// Returns: "0x..." (already in bytes32 format)
assertBytes32(studentHash);  // Validation guard
```

### String Field Truncation

Certificate fields (institution, course name, etc.) must fit within 31 bytes when UTF-8 encoded:

```typescript
import { validateBytes32Fields } from '@/utils/bytes32';

const safeFields = validateBytes32Fields({
  studentName: fields.studentName,
  courseName: fields.courseName,
  institution: fields.institution,
  issueDate: fields.issueDate,
});

// Long strings are automatically truncated:
// "Six Sigma and the Organization (Advanced)" → "Six Sigma and the Organizat…"
// "Kennesaw State University" → "Kennesaw State University" (fits)
```

## Utility Functions

### `hexToBytes32(hexString: string): \`0x${string}\``

Converts a 64-character hex string to proper bytes32 format.

```typescript
hexToBytes32("abc...def")     // → "0xabc...def"
hexToBytes32("0xabc...def")   // → "0xabc...def" (idempotent)
```

**Throws:** If input is not exactly 64 hex characters

### `assertBytes32(hex: string): asserts hex is \`0x${string}\``

Type guard that validates bytes32 format.

```typescript
assertBytes32("0xabc...def")  // ✅ No error
assertBytes32("abc...def")    // ❌ Throws: Missing 0x prefix
assertBytes32("0x1234")       // ❌ Throws: Wrong length
```

### `validateBytes32Fields(fields: CertificateFields): CertificateFields`

Truncates certificate fields to fit within 31 bytes.

```typescript
const safe = validateBytes32Fields({
  studentName: "Very Long Name That Exceeds Thirty One Bytes",
  courseName: "Course",
  institution: "MIT",
  issueDate: "2024-01-15"
});

// safe.studentName will be truncated with ellipsis
```

### `truncateForBytes32(str: string, maxBytes?: number): string`

Low-level truncation function with UTF-8 awareness.

```typescript
truncateForBytes32("Hello World")                    // → "Hello World" (unchanged)
truncateForBytes32("A".repeat(50))                   // → "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" (31 chars)
truncateForBytes32("你好世界".repeat(10))              // → Truncated to fit 31 bytes
```

## Debugging

### Enable Debug Logs

Debug logs are automatically enabled in development mode:

```typescript
if (import.meta.env.DEV) {
  console.log('[mint] File hash validation:', {
    originalSha256: fileSha256,
    bytes32Format: fileSha256Bytes32,
    length: fileSha256Bytes32.length,
    isValid: fileSha256Bytes32.length === 66
  });
}
```

### Expected Console Output

```
[mint] File hash validation: {
  originalSha256: "24024f8f9c62544dea8e5b1b36a4ceaddfacb445f360f3b36b4709e4d08764fd",
  bytes32Format: "0x24024f8f9c62544dea8e5b1b36a4ceaddfacb445f360f3b36b4709e4d08764fd",
  length: 66,
  isValid: true
}

[mint] Contract arguments: {
  to: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  tokenURI: "ipfs://QmX...",
  studentHash: "0xabc...def",
  studentHashLength: 66,
  safeFields: {
    studentName: "John Doe",
    courseName: "Computer Science 101",
    institution: "MIT",
    issueDate: "2024-01-15"
  },
  allFieldsValid: true
}
```

## Troubleshooting Checklist

### ✅ Verify bytes32 Format

1. **Check length:** Must be exactly 66 characters
2. **Check prefix:** Must start with `0x`
3. **Check characters:** Only hex digits (0-9, a-f, A-F) after `0x`

### ✅ Verify Field Lengths

1. **Check byte length:** Use `getByteLength(str)` to check UTF-8 byte count
2. **Max 31 bytes:** All string fields must fit within 31 bytes
3. **Truncation:** Long fields should show ellipsis (`…`)

### ✅ Common Fixes

| Error | Fix |
|-------|-----|
| "bytes64 does not match bytes32" | Add `0x` prefix using `hexToBytes32()` |
| "Expected bytes32, got length=X" | Validate hash is exactly 64 hex chars before adding prefix |
| "Invalid student hash" | Ensure `keccak256()` output is used directly (already has `0x`) |
| "String too long for bytes32" | Use `validateBytes32Fields()` to truncate |

## Smart Contract Interface

The `safeMint` function expects these bytes32 parameters:

```solidity
function safeMint(
    address to,
    string memory tokenURI,
    bytes32 studentHash,        // ← Must be bytes32 (0x + 64 hex)
    string memory studentName,   // ← Max 31 bytes (truncated by frontend)
    string memory courseName,    // ← Max 31 bytes (truncated by frontend)
    string memory institution,   // ← Max 31 bytes (truncated by frontend)
    string memory issueDate      // ← Max 31 bytes (truncated by frontend)
) external;
```

## Best Practices

1. **Always validate:** Use `assertBytes32()` before passing to contracts
2. **Always truncate:** Use `validateBytes32Fields()` for user input
3. **Always prefix:** Use `hexToBytes32()` for backend hashes
4. **Always log:** Enable debug logs in development
5. **Never assume:** Validate all bytes32 values at runtime

## Related Files

- `src/utils/bytes32.ts` - Utility functions
- `src/pages/Index.tsx` - Minting implementation
- `server/routes/ipfs.ts` - SHA-256 hash generation
- `contracts/src/EduProofCertificate.sol` - Smart contract

## References

- [Solidity bytes32 documentation](https://docs.soliditylang.org/en/latest/types.html#fixed-size-byte-arrays)
- [Viem ABI encoding](https://viem.sh/docs/abi/encodeAbiParameters.html)
- [UTF-8 encoding](https://en.wikipedia.org/wiki/UTF-8)
