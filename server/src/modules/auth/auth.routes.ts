import { Router } from 'express';
import { asyncHandler } from '../../utils/async';
import { ok, AppError } from '../../utils/http';
import { validate } from '../../middleware/validate';
import { isAuthenticated } from '../../middleware/auth';
import { csrfProtection } from '../../middleware/csrf';
import { loginLimiter } from '../../middleware/rateLimit';
import { clientIp, userAgent } from '../../utils/request';
import { changePasswordSchema, loginSchema } from './auth.schema';
import { authenticate, changePassword } from './auth.service';
import {
  consumeRefreshToken,
  issueRefreshToken,
  newCsrfToken,
  revokeRefreshToken,
  signAccessToken,
} from './tokens';
import {
  clearAuthCookies,
  REFRESH_COOKIE,
  setAccessCookie,
  setCsrfCookie,
  setRefreshCookie,
} from './cookies';

export const authRouter = Router();

/** Hands the SPA a CSRF token before any state-changing request. */
authRouter.get(
  '/csrf',
  asyncHandler(async (_req, res) => {
    const token = newCsrfToken();
    setCsrfCookie(res, token);
    res.json(ok({ csrfToken: token }));
  }),
);

authRouter.post(
  '/login',
  loginLimiter,
  csrfProtection,
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body as { email: string; password: string };
    const admin = await authenticate(email, password, {
      email,
      ip: clientIp(req),
      userAgent: userAgent(req),
    });

    const { token: refresh, expiresAt } = await issueRefreshToken(admin.id);
    setAccessCookie(res, signAccessToken({ sub: admin.id, role: admin.role }));
    setRefreshCookie(res, refresh, expiresAt);
    const csrfToken = newCsrfToken();
    setCsrfCookie(res, csrfToken);

    res.json(ok({ admin, csrfToken }));
  }),
);

authRouter.post(
  '/refresh',
  csrfProtection,
  asyncHandler(async (req, res) => {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (typeof token !== 'string' || !token) throw AppError.unauthorized('Session expired.');

    const record = await consumeRefreshToken(token);
    if (!record) {
      clearAuthCookies(res);
      throw AppError.unauthorized('Session expired.');
    }

    const { token: next, expiresAt } = await issueRefreshToken(record.adminId);
    setAccessCookie(res, signAccessToken({ sub: record.adminId, role: record.admin.role }));
    setRefreshCookie(res, next, expiresAt);
    const csrfToken = newCsrfToken();
    setCsrfCookie(res, csrfToken);

    res.json(
      ok({
        admin: {
          id: record.admin.id,
          email: record.admin.email,
          role: record.admin.role,
          name: record.admin.name,
        },
        csrfToken,
      }),
    );
  }),
);

authRouter.post(
  '/logout',
  csrfProtection,
  asyncHandler(async (req, res) => {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (typeof token === 'string' && token) await revokeRefreshToken(token);
    clearAuthCookies(res);
    res.json(ok({ loggedOut: true }));
  }),
);

authRouter.get(
  '/me',
  isAuthenticated,
  asyncHandler(async (req, res) => {
    res.json(ok({ admin: req.admin }));
  }),
);

authRouter.post(
  '/password',
  isAuthenticated,
  csrfProtection,
  validate(changePasswordSchema),
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body as {
      currentPassword: string;
      newPassword: string;
    };
    await changePassword(req.admin!.id, currentPassword, newPassword);
    clearAuthCookies(res);
    res.json(ok({ changed: true }));
  }),
);
