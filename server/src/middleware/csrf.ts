import type { NextFunction, Request, Response } from 'express';
import { CSRF_COOKIE } from '../modules/auth/cookies';
import { safeEqual } from '../modules/auth/tokens';
import { AppError } from '../utils/http';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Double-submit check on every state-changing request. */
export function csrfProtection(req: Request, _res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method)) return next();

  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const headerToken = req.get('x-csrf-token');

  if (typeof cookieToken !== 'string' || typeof headerToken !== 'string' || !cookieToken) {
    return next(new AppError(403, 'Your session expired. Reload the page and try again.', 'CSRF'));
  }
  if (!safeEqual(cookieToken, headerToken)) {
    return next(new AppError(403, 'Your session expired. Reload the page and try again.', 'CSRF'));
  }
  return next();
}
