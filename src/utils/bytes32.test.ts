import { describe, expect, it } from 'vitest';
import {
  truncateForBytes32,
  getByteLength,
  fitsInBytes32,
  hexToBytes32,
  assertBytes32,
} from './bytes32';

describe('getByteLength', () => {
  it('counts UTF-8 bytes, not characters', () => {
    expect(getByteLength('abc')).toBe(3);
    expect(getByteLength('é')).toBe(2);
    expect(getByteLength('🚀')).toBe(4);
  });
});

describe('fitsInBytes32', () => {
  it('respects the byte limit', () => {
    expect(fitsInBytes32('a'.repeat(31))).toBe(true);
    expect(fitsInBytes32('é'.repeat(15))).toBe(true);
    expect(fitsInBytes32('é'.repeat(16))).toBe(false);
  });
});

describe('truncateForBytes32', () => {
  it('keeps short ASCII strings intact', () => {
    expect(truncateForBytes32('MIT')).toBe('MIT');
  });

  it('truncates multi-byte strings to the byte limit without corrupting UTF-8', () => {
    const out = truncateForBytes32('é'.repeat(100));
    expect(getByteLength(out)).toBeLessThanOrEqual(31);
  });

  it('never exceeds the byte budget', () => {
    const out = truncateForBytes32('a'.repeat(100));
    expect(getByteLength(out)).toBeLessThanOrEqual(31);
  });

  it('appends the ellipsis only when it fits within the budget', () => {
    // 4-byte characters: 7 chars = 28 bytes leaves room for the 3-byte '…'
    const out = truncateForBytes32('🚀'.repeat(100));
    expect(getByteLength(out)).toBeLessThanOrEqual(31);
    expect(out.endsWith('…')).toBe(true);
  });

  it('never splits a surrogate pair', () => {
    const out = truncateForBytes32('🚀'.repeat(100), 30);
    // Must consist of whole code points only
    for (const ch of out) {
      const code = ch.codePointAt(0)!;
      expect(code >= 0xd800 && code <= 0xdfff).toBe(false);
    }
    expect(getByteLength(out)).toBeLessThanOrEqual(30);
  });
});

describe('hexToBytes32', () => {
  it('accepts 64 hex chars with or without 0x prefix', () => {
    const hex = 'a'.repeat(64);
    expect(hexToBytes32(hex)).toBe(`0x${hex}`);
    expect(hexToBytes32(`0x${hex}`)).toBe(`0x${hex}`);
  });

  it('rejects malformed input', () => {
    expect(() => hexToBytes32('abc')).toThrow();
    expect(() => hexToBytes32(`${'a'.repeat(63)}z`)).toThrow();
  });
});

describe('assertBytes32', () => {
  it('passes for valid bytes32', () => {
    expect(() => assertBytes32(`0x${'a'.repeat(64)}`)).not.toThrow();
  });

  it('throws for wrong length or non-hex', () => {
    expect(() => assertBytes32('0xabcd')).toThrow();
    expect(() => assertBytes32(`0x${'z'.repeat(64)}`)).toThrow();
  });
});
