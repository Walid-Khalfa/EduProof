/**
 * Normalize a string for consistent comparison
 * - Trim whitespace
 * - Convert to lowercase
 * - Remove accents/diacritics
 * - Normalize multiple spaces to single space
 */
export function normalize(s: string): string {
  return (s || "")
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}
