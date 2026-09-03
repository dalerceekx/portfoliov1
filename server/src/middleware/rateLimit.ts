import rateLimit, { type Options } from 'express-rate-limit';
import { env } from '../config/env';

const shared: Partial<Options> = {
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => env.isTest,
  message: { success: false, code: 'RATE_LIMITED', message: 'Too many requests. Try again later.' },
};

/**
 * Blanket ceiling for the whole API. It has to clear real usage, not just a
 * public visit: the admin panel fires several requests per screen, and a NAT'd
 * office shares one IP. The endpoints worth protecting have their own far
 * stricter limiters below.
 */
export const apiLimiter = rateLimit({ ...shared, windowMs: 60 * 60 * 1000, limit: 600 });

/** Login is far stricter: 5 attempts / 15 minutes / IP. */
export const loginLimiter = rateLimit({
  ...shared,
  windowMs: 15 * 60 * 1000,
  limit: 5,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    code: 'RATE_LIMITED',
    message: 'Too many login attempts. Try again in 15 minutes.',
  },
});

export const contactLimiter = rateLimit({ ...shared, windowMs: 60 * 60 * 1000, limit: 5 });

export const uploadLimiter = rateLimit({ ...shared, windowMs: 60 * 60 * 1000, limit: 40 });
