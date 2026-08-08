import { Router, Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

const router = Router();

const GATEWAYS = [
  'https://gateway.pinata.cloud',
  'https://cloudflare-ipfs.com',
  'https://ipfs.io'
];

const CID_REGEX = /^(Qm|baf)[A-Za-z0-9]+$/;
const GATEWAY_TIMEOUT = 4000;
const MAX_PREVIEW_BYTES = 512 * 1024;

const isProduction = process.env.NODE_ENV === 'production';

interface GatewayAttempt {
  url: string;
  headStatus?: number;
  headType?: string;
  error?: string;
  durationMs?: number;
}

function isValidCID(cid: string): boolean {
  return CID_REGEX.test(cid);
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<globalThis.Response> {
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

async function tryGateway(gateway: string, cid: string): Promise<{
  success: boolean;
  response?: globalThis.Response;
  svg?: string;
  attempt: GatewayAttempt;
}> {
  const url = `${gateway}/ipfs/${cid}?filename=preview.svg`;
  const startTime = Date.now();
  const attempt: GatewayAttempt = { url };

  try {
    logger.debug('IPFS preview gateway attempt', { url });

    const headResponse = await fetchWithTimeout(url, {
      method: 'HEAD',
      headers: { Accept: 'image/svg+xml' }
    }, GATEWAY_TIMEOUT);

    attempt.headStatus = headResponse.status;
    attempt.headType = headResponse.headers.get('content-type') || undefined;

    if (headResponse.status !== 200) {
      attempt.error = `HEAD failed with status ${headResponse.status}`;
      return { success: false, attempt };
    }

    const contentType = headResponse.headers.get('content-type') || '';
    if (!contentType.includes('image/svg+xml') && !contentType.includes('svg')) {
      attempt.error = `Invalid content-type: ${contentType}`;
      return { success: false, attempt };
    }

    const getResponse = await fetchWithTimeout(url, {
      method: 'GET',
      headers: { Accept: 'image/svg+xml' }
    }, GATEWAY_TIMEOUT);

    if (!getResponse.ok) {
      attempt.error = `GET failed with status ${getResponse.status}`;
      return { success: false, attempt };
    }

    // Hard cap on the response body: gateways can serve arbitrary-sized
    // objects and this route is unauthenticated, so an unbounded read is a
    // memory-exhaustion vector. The stream is aborted past the limit.
    const reader = getResponse.body?.getReader();
    if (!reader) {
      attempt.error = 'Response body unavailable';
      return { success: false, attempt };
    }

    const chunks: Uint8Array[] = [];
    let received = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > MAX_PREVIEW_BYTES) {
        await reader.cancel();
        attempt.error = 'Preview exceeds size limit';
        return { success: false, attempt };
      }
      chunks.push(value);
    }

    const svg = Buffer.concat(chunks.map(c => Buffer.from(c))).toString('utf8');
    attempt.durationMs = Date.now() - startTime;

    if (!svg.trim().startsWith('<svg')) {
      attempt.error = 'Response does not start with <svg';
      return { success: false, attempt };
    }

    logger.debug('IPFS preview gateway success', { url, bytes: svg.length, durationMs: attempt.durationMs });

    return {
      success: true,
      response: getResponse,
      svg,
      attempt
    };

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    attempt.error = message;
    attempt.durationMs = Date.now() - startTime;
    logger.error('IPFS preview gateway error', { url, message });
    return { success: false, attempt };
  }
}

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

router.get('/preview/:cid.debug', async (req: Request, res: Response, next: NextFunction) => {
  // Diagnostic endpoint: never exposed in production (leaks gateway URLs,
  // statuses and body samples, and makes 3 outbound fetches per request).
  if (isProduction) {
    return res.status(404).json({ error: 'not_found', message: 'Not found' });
  }

  const cid = String(req.params.cid || "");
  const startTime = Date.now();

  logger.debug('IPFS preview debug', { cid });

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
  } catch (error) {
    logger.error('IPFS preview debug error', { cid, message: error instanceof Error ? error.message : String(error) });
    next(error);
  }
});

router.get('/preview/:cid.svg', async (req: Request, res: Response, next: NextFunction) => {
  const cid = String(req.params.cid || "");
  const startTime = Date.now();

  logger.debug('IPFS preview request', { cid });

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
      res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300, stale-while-revalidate=60');
      res.setHeader('X-IPFS-Gateway', result.finalUrl || 'unknown');
      res.setHeader('X-Response-Time', `${durationMs}ms`);

      logger.debug('IPFS preview served', { cid, url: result.finalUrl, bytes: result.svg.length, durationMs });

      return res.send(result.svg);
    } else {
      const lastAttempt = result.attempts[result.attempts.length - 1];
      logger.warn('IPFS preview all gateways failed', { cid, attempts: result.attempts.length, durationMs });

      return res.status(502).json({
        error: 'bad_gateway',
        message: 'All IPFS gateways failed to retrieve SVG',
        cid,
        gatewaysTried: result.attempts,
        lastStatus: lastAttempt?.headStatus,
        lastContentType: lastAttempt?.headType
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('IPFS preview proxy error', { cid, message, stack: error instanceof Error ? error.stack : undefined });
    next(error);
  }
});

export default router;
