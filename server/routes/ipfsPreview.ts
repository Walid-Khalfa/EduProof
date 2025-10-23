import { Router, Request, Response } from 'express';

const router = Router();

// IPFS gateways to try in order
const GATEWAYS = [
  'https://gateway.pinata.cloud',
  'https://cloudflare-ipfs.com',
  'https://ipfs.io'
];

// Strict CID validation (v0: Qm..., v1: baf...)
const CID_REGEX = /^(Qm|baf)[A-Za-z0-9]+$/;

// Timeout per gateway attempt (ms)
const GATEWAY_TIMEOUT = 4000;

interface GatewayAttempt {
  url: string;
  headStatus?: number;
  headType?: string;
  error?: string;
  durationMs?: number;
}

/**
 * Validate CID format
 */
function isValidCID(cid: string): boolean {
  return CID_REGEX.test(cid);
}

/**
 * Fetch with timeout
 */
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeout);
    return response;
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
}

/**
 * Try to fetch SVG from a single gateway
 */
async function tryGateway(gateway: string, cid: string): Promise<{
  success: boolean;
  response?: Response;
  svg?: string;
  attempt: GatewayAttempt;
}> {
  const url = `${gateway}/ipfs/${cid}?filename=preview.svg`;
  const startTime = Date.now();
  const attempt: GatewayAttempt = { url };

  try {
    console.log(`[ipfs.preview.try] url=${url}`);

    // First, try HEAD to check content-type without downloading
    const headStart = Date.now();
    const headResponse = await fetchWithTimeout(url, {
      method: 'HEAD',
      headers: { Accept: 'image/svg+xml' }
    }, GATEWAY_TIMEOUT);

    attempt.headStatus = headResponse.status;
    attempt.headType = headResponse.headers.get('content-type') || undefined;
    
    console.log(`[ipfs.preview.try] HEAD status=${headResponse.status} type=${attempt.headType} time=${Date.now() - headStart}ms`);

    // Check if HEAD succeeded and content-type is SVG
    if (headResponse.status !== 200) {
      attempt.error = `HEAD failed with status ${headResponse.status}`;
      return { success: false, attempt };
    }

    const contentType = headResponse.headers.get('content-type') || '';
    if (!contentType.includes('image/svg+xml') && !contentType.includes('svg')) {
      attempt.error = `Invalid content-type: ${contentType}`;
      return { success: false, attempt };
    }

    // Now GET the actual content
    const getStart = Date.now();
    const getResponse = await fetchWithTimeout(url, {
      method: 'GET',
      headers: { Accept: 'image/svg+xml' }
    }, GATEWAY_TIMEOUT);

    if (!getResponse.ok) {
      attempt.error = `GET failed with status ${getResponse.status}`;
      return { success: false, attempt };
    }

    const svg = await getResponse.text();
    attempt.durationMs = Date.now() - startTime;

    console.log(`[ipfs.preview.try] GET bytes=${svg.length} time=${Date.now() - getStart}ms`);

    // Validate SVG content starts with <svg
    if (!svg.trim().startsWith('<svg')) {
      attempt.error = 'Response does not start with <svg';
      return { success: false, attempt };
    }

    console.log(`[ipfs.preview.ok] url=${url} bytes=${svg.length} time=${attempt.durationMs}ms`);
    
    return {
      success: true,
      response: getResponse,
      svg,
      attempt
    };

  } catch (error: any) {
    attempt.error = error.message;
    attempt.durationMs = Date.now() - startTime;
    console.error(`[ipfs.preview.err] url=${url} message="${error.message}"`);
    return { success: false, attempt };
  }
}

/**
 * Try all gateways in order until one succeeds
 */
async function fetchFromGateways(cid: string): Promise<{
  success: boolean;
  svg?: string;
  finalUrl?: string;
  attempts: GatewayAttempt[];
}> {
  const attempts: GatewayAttempt[] = [];

  for (const gateway of GATEWAYS) {
    const result = await tryGateway(gateway, cid);
    attempts.push(result.attempt);

    if (result.success && result.svg) {
      return {
        success: true,
        svg: result.svg,
        finalUrl: result.attempt.url,
        attempts
      };
    }
  }

  return { success: false, attempts };
}

/**
 * GET /api/ipfs/preview/:cid.debug
 * Diagnostic endpoint that probes all gateways and returns detailed info
 * PUBLIC route - no authentication required
 */
router.get('/preview/:cid.debug', async (req: Request, res: Response) => {
  const { cid } = req.params;
  const startTime = Date.now();

  console.log(`[ipfs.preview.debug] cid=${cid}`);

  // Validate CID
  if (!isValidCID(cid)) {
    return res.status(400).json({
      error: 'invalid_cid',
      message: 'CID must match pattern: ^(Qm|baf)[A-Za-z0-9]+$',
      cid
    });
  }

  try {
    const result = await fetchFromGateways(cid);
    const durationMs = Date.now() - startTime;

    if (result.success && result.svg) {
      // Return diagnostic info (not the actual SVG)
      return res.json({
        cid,
        finalUrl: result.finalUrl,
        status: 200,
        contentType: 'image/svg+xml',
        bytes: result.svg.length,
        gatewaysTried: result.attempts,
        sample: result.svg.substring(0, 200),
        durationMs
      });
    } else {
      // All gateways failed
      const lastAttempt = result.attempts[result.attempts.length - 1];
      return res.status(502).json({
        error: 'bad_gateway',
        message: 'All IPFS gateways failed',
        cid,
        gatewaysTried: result.attempts,
        lastStatus: lastAttempt?.headStatus,
        lastContentType: lastAttempt?.headType,
        durationMs
      });
    }
  } catch (error: any) {
    console.error(`[ipfs.preview.debug.err] cid=${cid} message="${error.message}"`);
    return res.status(500).json({
      error: 'debug_error',
      message: error.message,
      cid
    });
  }
});

/**
 * GET /api/ipfs/preview/:cid.svg
 * Proxy IPFS SVG previews with correct Content-Type and multi-gateway fallback
 * PUBLIC route - no authentication required
 */
router.get('/preview/:cid.svg', async (req: Request, res: Response) => {
  const { cid } = req.params;
  const startTime = Date.now();

  console.log(`[ipfs.preview] cid=${cid}`);

  // Validate CID
  if (!isValidCID(cid)) {
    return res.status(400).json({
      error: 'invalid_cid',
      message: 'CID must match pattern: ^(Qm|baf)[A-Za-z0-9]+$',
      cid
    });
  }

  try {
    const result = await fetchFromGateways(cid);
    const durationMs = Date.now() - startTime;

    if (result.success && result.svg) {
      // Success - return SVG with proper headers
      res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300, stale-while-revalidate=60');
      res.setHeader('X-IPFS-Gateway', result.finalUrl || 'unknown');
      res.setHeader('X-Response-Time', `${durationMs}ms`);
      
      console.log(`[ipfs.preview.success] cid=${cid} url=${result.finalUrl} bytes=${result.svg.length} time=${durationMs}ms`);
      
      return res.send(result.svg);
    } else {
      // All gateways failed
      const lastAttempt = result.attempts[result.attempts.length - 1];
      console.error(`[ipfs.preview.failed] cid=${cid} attempts=${result.attempts.length} time=${durationMs}ms`);
      
      return res.status(502).json({
        error: 'bad_gateway',
        message: 'All IPFS gateways failed to retrieve SVG',
        cid,
        gatewaysTried: result.attempts,
        lastStatus: lastAttempt?.headStatus,
        lastContentType: lastAttempt?.headType
      });
    }
  } catch (error: any) {
    console.error(`[ipfs.preview.err] cid=${cid} message="${error.message}" stack=${error.stack}`);
    return res.status(500).json({
      error: 'preview_proxy_error',
      message: error.message,
      cid
    });
  }
});

export default router;
