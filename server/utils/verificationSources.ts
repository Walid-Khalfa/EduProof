/**
 * Infer verification URL based on institution name and certificate ID
 * Returns canonical verification URL or search fallback
 */
export function inferVerificationUrl(institution: string, certId?: string): string | undefined {
  const name = (institution || "").toLowerCase().trim();

  // Coursera: https://www.coursera.org/account/accomplishments/verify/<ID>
  if (name.includes("coursera") && certId) {
    return `https://www.coursera.org/account/accomplishments/verify/${encodeURIComponent(certId)}`;
  }

  // edX: https://courses.edx.org/certificates/<ID>
  if (name.includes("edx") && certId) {
    return `https://courses.edx.org/certificates/${encodeURIComponent(certId)}`;
  }

  // Udacity: https://confirm.udacity.com/<ID>
  if (name.includes("udacity") && certId) {
    return `https://confirm.udacity.com/${encodeURIComponent(certId)}`;
  }

  // LinkedIn Learning: https://www.linkedin.com/learning/certificates/<ID>
  if ((name.includes("linkedin") || name.includes("lynda")) && certId) {
    return `https://www.linkedin.com/learning/certificates/${encodeURIComponent(certId)}`;
  }

  // Google Career Certificates
  if (name.includes("google") && name.includes("career") && certId) {
    return `https://www.coursera.org/account/accomplishments/verify/${encodeURIComponent(certId)}`;
  }

  // General fallback: Google search for verification
  if (institution) {
    const query = `${institution} certificate verification ${certId ?? ""}`.trim();
    return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  }

  return undefined;
}

/**
 * Extract URL from raw text using regex
 */
export function extractUrlFromText(text: string): string | undefined {
  const match = text.match(/https?:\/\/[^\s"'<>()]+/i);
  return match ? match[0] : undefined;
}
