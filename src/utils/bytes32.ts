/**
 * Utility functions for safe bytes32 encoding
 * Ensures strings don't overflow the 32-byte limit required by Solidity bytes32
 */

/**
 * Safely truncate a string to fit within bytes32 (32 bytes max)
 * UTF-8 encoding means some characters take multiple bytes
 * We truncate to 31 characters max to be safe
 * 
 * @param str - Input string to truncate
 * @param maxBytes - Maximum bytes allowed (default 31 to leave room for null terminator)
 * @returns Truncated string that fits within maxBytes when UTF-8 encoded
 */
export function truncateForBytes32(str: string, maxBytes: number = 31): string {
  if (!str) return '';
  
  // Quick check: if string is short enough, return as-is
  if (str.length <= maxBytes) {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(str);
    if (bytes.length <= maxBytes) {
      return str;
    }
  }
  
  // String is too long, need to truncate
  const encoder = new TextEncoder();
  let truncated = str;
  
  // Binary search for the right length
  let left = 0;
  let right = str.length;
  
  while (left < right) {
    const mid = Math.floor((left + right + 1) / 2);
    const candidate = str.substring(0, mid);
    const bytes = encoder.encode(candidate);
    
    if (bytes.length <= maxBytes) {
      left = mid;
    } else {
      right = mid - 1;
    }
  }
  
  truncated = str.substring(0, left);
  
  // Add ellipsis if truncated (but ensure it still fits)
  if (truncated.length < str.length) {
    const withEllipsis = truncated + '…';
    const ellipsisBytes = encoder.encode(withEllipsis);
    if (ellipsisBytes.length <= maxBytes) {
      return withEllipsis;
    }
  }
  
  return truncated;
}

/**
 * Validate and prepare certificate fields for bytes32 encoding
 * Truncates long strings to prevent overflow errors
 * 
 * @param fields - Certificate fields to validate
 * @returns Validated and truncated fields safe for bytes32 encoding
 */
export interface CertificateFields {
  studentName: string;
  courseName: string;
  institution: string;
  issueDate: string;
}

export function validateBytes32Fields(fields: CertificateFields): CertificateFields {
  return {
    studentName: truncateForBytes32(fields.studentName),
    courseName: truncateForBytes32(fields.courseName),
    institution: truncateForBytes32(fields.institution),
    issueDate: truncateForBytes32(fields.issueDate),
  };
}

/**
 * Get byte length of a UTF-8 string
 * @param str - Input string
 * @returns Number of bytes when UTF-8 encoded
 */
export function getByteLength(str: string): number {
  const encoder = new TextEncoder();
  return encoder.encode(str).length;
}

/**
 * Check if a string fits within bytes32 limit
 * @param str - Input string
 * @param maxBytes - Maximum bytes allowed (default 31)
 * @returns True if string fits, false otherwise
 */
export function fitsInBytes32(str: string, maxBytes: number = 31): boolean {
  return getByteLength(str) <= maxBytes;
}

/**
 * Convert a hex string (without 0x prefix) to bytes32 format (0x + 64 hex chars)
 * @param hexString - Hex string (64 chars, no 0x prefix)
 * @returns Properly formatted bytes32 string
 */
export function hexToBytes32(hexString: string): `0x${string}` {
  // Remove 0x prefix if present
  const cleanHex = hexString.startsWith('0x') ? hexString.slice(2) : hexString;
  
  // Validate hex string is exactly 64 characters
  if (!/^[0-9a-fA-F]{64}$/.test(cleanHex)) {
    throw new Error(`Invalid hex string for bytes32: expected 64 hex chars, got ${cleanHex.length}`);
  }
  
  return `0x${cleanHex}` as `0x${string}`;
}

/**
 * Assert that a value is a valid bytes32 (0x + 64 hex chars)
 * @param hex - Value to validate
 * @throws Error if not valid bytes32
 */
export function assertBytes32(hex: string): asserts hex is `0x${string}` {
  if (!hex.startsWith('0x') || hex.length !== 66) {
    throw new Error(`Expected bytes32 (0x + 64 hex chars), got length=${hex.length}`);
  }
  
  // Validate hex characters
  if (!/^0x[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error(`Invalid bytes32 format: contains non-hex characters`);
  }
}
