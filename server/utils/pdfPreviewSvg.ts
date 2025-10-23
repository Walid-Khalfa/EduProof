/**
 * PDF Preview SVG Generator
 * Generates branded SVG preview card for PDF certificates
 * No native dependencies required
 */

export interface PdfPreviewInput {
  institution?: string;
  student?: string;
  course?: string;
  issueDate?: string;  // ISO date string
  width?: number;      // px
  height?: number;     // px
}

/**
 * Escape XML special characters
 */
const escapeXml = (str = '') => 
  str.replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]!));

/**
 * Build branded SVG preview for PDF certificate
 * @param input - Certificate metadata
 * @returns SVG string
 */
export function buildPdfPreviewSVG(input: PdfPreviewInput): string {
  const W = input.width ?? 1200;
  const H = input.height ?? 675;  // 16:9 social card ratio
  const title = 'EduProof • PDF Certificate';
  const institution = escapeXml(input.institution ?? 'Institution');
  const student = escapeXml(input.student ?? 'Student Name');
  const course = escapeXml(input.course ?? 'Course / Program');
  const date = escapeXml(input.issueDate ?? 'YYYY-MM-DD');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0ea5e9"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#g)"/>
  <rect x="40" y="40" width="${W-80}" height="${H-80}" rx="28" fill="white" opacity="0.9"/>
  <text x="80" y="120" font-size="42" font-weight="700" fill="#0f172a">${title}</text>
  <text x="80" y="200" font-size="28" fill="#0f172a">Institution</text>
  <text x="80" y="240" font-size="34" font-weight="600" fill="#111827">${institution}</text>
  <text x="80" y="310" font-size="28" fill="#0f172a">Student</text>
  <text x="80" y="350" font-size="34" font-weight="600" fill="#111827">${student}</text>
  <text x="80" y="420" font-size="28" fill="#0f172a">Course</text>
  <text x="80" y="460" font-size="34" font-weight="600" fill="#111827">${course}</text>
  <text x="80" y="530" font-size="28" fill="#0f172a">Issue date</text>
  <text x="80" y="570" font-size="34" font-weight="600" fill="#111827">${date}</text>
  <text x="${W-80}" y="${H-60}" font-size="22" fill="#334155" text-anchor="end">eduproof.app • On-chain verified</text>
</svg>`;
}
