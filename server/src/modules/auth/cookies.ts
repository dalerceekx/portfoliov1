import type { CookieOptions, Response } from 'express';
import { env } from '../../config/env';

export const ACCESS_COOKIE = 'pf_at';
export const REFRESH_COOKIE = 'pf_rt';
export const CSRF_COOKIE = 'pf_csrf';

const base: CookieOptions = {
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: 'lax',
  path: '/',
  ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
};

export function setAccessCookie(res: Response, token: string) {
  res.cookie(ACCESS_COOKIE, token, { ...base, maxAge: env.JWT_ACCESS_TTL_SECONDS * 1000 });
}

export function setRefreshCookie(res: Response, token: string, expiresAt: Date) {
  res.cookie(REFRESH_COOKIE, token, {
    ...base,
    path: '/api/auth',
    expires: expiresAt,
  });
}

/**
 * CSRF token lives in an httpOnly cookie and is echoed back to the client in the
 * response body. The browser cannot read it cross-origin and a forged form cannot
 * set the matching header, so the pair only lines up for our own SPA.
 */
export function setCsrfCookie(res: Response, token: string) {
  res.cookie(CSRF_COOKIE, token, { ...base, maxAge: 12 * 60 * 60 * 1000 });
}

export function clearAuthCookies(res: Response) {
  res.clearCookie(ACCESS_COOKIE, { ...base });
  res.clearCookie(REFRESH_COOKIE, { ...base, path: '/api/auth' });
  res.clearCookie(CSRF_COOKIE, { ...base });
}
