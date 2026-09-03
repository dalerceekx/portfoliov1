import path from 'node:path';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import { env } from './config/env';
import { logger } from './lib/logger';
import { apiRouter } from './routes';
import { apiLimiter } from './middleware/rateLimit';
import { errorHandler, notFoundHandler } from './middleware/error';
import { uploadDir } from './modules/uploads/uploads.routes';

export function createApp() {
  const app = express();

  // Number of proxies to look through for the real client IP: 1 for the bundled
  // Nginx, 2 when an ALB or CloudFront sits in front of it. Rate limiting and the
  // login log are only as accurate as this value — see TRUST_PROXY_HOPS.
  app.set('trust proxy', env.TRUST_PROXY_HOPS);
  app.disable('x-powered-by');

  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'default-src': ["'self'"],
          'img-src': ["'self'", 'data:', 'https:'],
          'script-src': ["'self'"],
          'style-src': ["'self'", "'unsafe-inline'"],
          'font-src': ["'self'", 'data:'],
          'connect-src': ["'self'", ...env.corsOrigins],
          'frame-ancestors': ["'none'"],
          'object-src': ["'none'"],
          'base-uri': ["'self'"],
          'form-action': ["'self'"],
          'upgrade-insecure-requests': env.isProd ? [] : null,
        },
      },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      hsts: env.isProd ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
    }),
  );

  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin || env.corsOrigins.includes(origin)) return cb(null, true);
        return cb(new Error('Origin not allowed'));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
      maxAge: 600,
    }),
  );

  app.use(compression());
  app.use(express.json({ limit: '64kb' }));
  app.use(express.urlencoded({ extended: false, limit: '64kb' }));
  app.use(cookieParser());
  if (!env.isTest) app.use(pinoHttp({ logger }));

  app.use(
    '/uploads',
    express.static(uploadDir, {
      maxAge: '30d',
      immutable: true,
      index: false,
      dotfiles: 'deny',
      setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff'),
    }),
  );

  app.use('/api', apiLimiter, apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export const publicDir = path.resolve('public');
