import type { NextFunction, Request, Response } from 'express';
import { logger } from './logger';

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Error carrying an HTTP status, a stable machine-readable code and an
 * optional payload. Route-level code should throw this instead of
 * responding with internal error text.
 */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly extra?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

/**
 * Normalizes any thrown error into a safe HTTP response.
 * Internal details (provider payloads, Postgres errors, stack traces) are
 * never sent to clients in production.
 */
export function toHttpError(
  err: unknown
): { status: number; code: string; message: string; extra?: Record<string, unknown> } {
  if (err instanceof HttpError) {
    return { status: err.status, code: err.code, message: err.message, extra: err.extra };
  }

  const e = err as { name?: string; code?: string; message?: string };
  if (e?.name === 'MulterError') {
    return {
      status: e.code === 'LIMIT_FILE_SIZE' ? 413 : 400,
      code: e.code || 'UPLOAD_ERROR',
      message: e.message || 'File upload failed'
    };
  }
  if (e?.message === 'Not allowed by CORS') {
    return { status: 403, code: 'CORS_BLOCKED', message: 'Origin not allowed by CORS' };
  }

  const message = isProduction ? 'Internal Server Error' : e?.message || String(err);
  return { status: 500, code: 'INTERNAL_ERROR', message };
}

/** Express error handler registered last. */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const { status, code } = toHttpError(err);
  logger.error('Express Error Handler', {
    method: req.method,
    url: req.url,
    status,
    code,
    errorType: err instanceof Error ? err.constructor.name : typeof err,
    errorMessage: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  });
  if (res.headersSent) {
    return;
  }
  const { message, extra } = toHttpError(err);
  res.status(status).json({ ok: false, error: code, message, ...extra });
}
