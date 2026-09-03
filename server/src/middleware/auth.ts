import type { NextFunction, Request, Response } from 'express';
import { ACCESS_COOKIE } from '../modules/auth/cookies';
import { verifyAccessToken } from '../modules/auth/tokens';
import { prisma } from '../lib/prisma';
import { AppError } from '../utils/http';
import { asyncHandler } from '../utils/async';

declare module 'express-serve-static-core' {
  interface Request {
    admin?: { id: string; email: string; role: string; name: string | null };
  }
}

/**
 * Server-side gate for every admin route. The frontend router only hides UI —
 * authorisation is decided here, on every request.
 */
export const isAuthenticated = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const token = req.cookies?.[ACCESS_COOKIE];
    if (typeof token !== 'string' || !token) throw AppError.unauthorized();

    const payload = verifyAccessToken(token);
    if (!payload) throw AppError.unauthorized('Session expired.');

    const admin = await prisma.admin.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, name: true },
    });
    if (!admin) throw AppError.unauthorized();

    req.admin = admin;
    next();
  },
);

/** Ready for an EDITOR role without rewriting the routes. */
export const hasRole =
  (...roles: string[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.admin) return next(AppError.unauthorized());
    if (!roles.includes(req.admin.role)) return next(AppError.forbidden());
    return next();
  };
