import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { MulterError } from 'multer';
import { AppError, type ApiFailure } from '../utils/http';
import { logger } from '../lib/logger';
import { env } from '../config/env';

export function notFoundHandler(_req: Request, _res: Response, next: NextFunction) {
  next(AppError.notFound('This endpoint does not exist.'));
}

/** http-errors marks anything safe to surface with `expose`; we only trust 4xx. */
function isClientError(err: unknown): err is Error & { status: number } {
  if (!(err instanceof Error)) return false;
  const status = (err as { status?: unknown; statusCode?: unknown }).status ??
    (err as { statusCode?: unknown }).statusCode;
  const exposed = (err as { expose?: unknown }).expose === true;
  return exposed && typeof status === 'number' && status >= 400 && status < 500;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  let status = 500;
  let body: ApiFailure = { success: false, message: 'Something went wrong.', code: 'INTERNAL' };

  if (err instanceof AppError) {
    status = err.status;
    body = { success: false, message: err.message, code: err.code };
    if (err.details) body.errors = err.details;
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      status = 409;
      body = { success: false, message: 'This value is already in use.', code: 'CONFLICT' };
    } else if (err.code === 'P2025') {
      status = 404;
      body = { success: false, message: 'Not found.', code: 'NOT_FOUND' };
    }
  } else if (err instanceof MulterError) {
    // Rejected by the upload limits, not a server fault.
    status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    body = {
      success: false,
      message:
        err.code === 'LIMIT_FILE_SIZE'
          ? `That image is too large. The limit is ${Math.round(env.MAX_UPLOAD_BYTES / 1024 / 1024)} MB.`
          : 'That upload could not be accepted. Send a single image in the "file" field.',
      code: err.code === 'LIMIT_FILE_SIZE' ? 'PAYLOAD_TOO_LARGE' : 'BAD_REQUEST',
    };
  } else if (isClientError(err)) {
    // body-parser and friends throw http-errors: an oversized or malformed body
    // is the caller's problem, so it must not be reported as a 500.
    status = err.status;
    body = {
      success: false,
      message:
        err.status === 413
          ? 'That request body is too large.'
          : 'The request body could not be read.',
      code: err.status === 413 ? 'PAYLOAD_TOO_LARGE' : 'BAD_REQUEST',
    };
  }

  if (status >= 500) {
    logger.error({ err, path: req.originalUrl, method: req.method }, 'Unhandled request error');
  } else {
    logger.warn({ status, code: body.code, path: req.originalUrl }, 'Request rejected');
  }

  // Stack traces never leave the server in production.
  if (!env.isProd && status >= 500 && err instanceof Error) {
    (body as ApiFailure & { stack?: string }).stack = err.stack;
  }

  res.status(status).json(body);
}
