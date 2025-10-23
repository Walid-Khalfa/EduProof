/**
 * Share utilities for post-mint proof sharing
 */

const API_URL = import.meta.env.VITE_API_URL || '';

/**
 * Build proxy preview URL for PDF SVG with cache-busting
 */
export function buildProxyPreviewUrl(cid: string): string {
  const cacheBust = `${cid.slice(-6)}-${Date.now() % 100000}`;
  return `${API_URL}/api/ipfs/preview/${cid}.svg?t=${cacheBust}`;
}

/**
 * Convert IPFS URI to gateway URL
 */
export function ipfsToGateway(uri: string): string {
  if (uri.startsWith('ipfs://')) {
    return `https://gateway.pinata.cloud/ipfs/${uri.replace('ipfs://', '')}`;
  }
  return uri;
}

/**
 * Build markdown block with all proof links
 */
export function buildProofMarkdown(data: {
  previewUrl: string;
  metadataUrl: string;
  etherscanUrl: string;
  verificationUrl?: string | null;
  isPdf?: boolean;
  pdfPreviewCid?: string | null;
}): string {
  const verificationLine = data.verificationUrl 
    ? `\n**Verification URL:** ${data.verificationUrl}\n` 
    : '';
  
  const imageLabel = data.isPdf ? 'IPFS PDF Preview' : 'IPFS Image';
  
  return `## Certificate Proof Links

**${imageLabel}:** ${data.previewUrl}

**IPFS Metadata:** ${data.metadataUrl}

**Etherscan TX:** ${data.etherscanUrl}${verificationLine}
`;
}

/**
 * Fetch and return metadata JSON object
 */
export async function fetchMetadataJSON(metadataUrl: string): Promise<any> {
  const gatewayUrl = ipfsToGateway(metadataUrl);
  const response = await fetch(gatewayUrl);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch metadata: ${response.status}`);
  }
  
  const json = await response.json();
  return json;
}

/**
 * Open multiple URLs in new tabs
 * Returns number of successfully opened tabs
 */
export function openAllLinks(data: {
  previewUrl: string;
  metadataUrl: string;
  etherscanUrl: string;
  verificationUrl?: string | null;
  isPdf?: boolean;
  pdfPreviewCid?: string | null;
}): number {
  const urls = [
    data.previewUrl,
    data.metadataUrl,
    data.etherscanUrl,
  ];
  
  if (data.verificationUrl) {
    urls.push(data.verificationUrl);
  }
  
  let opened = 0;
  
  urls.forEach((url) => {
    const win = window.open(url, '_blank', 'noopener,noreferrer');
    if (win) opened++;
  });
  
  return opened;
}

/**
 * Check if proxy preview is available via HEAD request
 */
export async function checkProxyPreview(cid: string): Promise<boolean> {
  try {
    const url = buildProxyPreviewUrl(cid);
    const response = await fetch(url, { method: 'HEAD' });
    
    const contentType = response.headers.get('content-type') || '';
    return response.ok && contentType.includes('image/svg+xml');
  } catch {
    return false;
  }
}
