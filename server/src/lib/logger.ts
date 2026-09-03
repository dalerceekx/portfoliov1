import pino from 'pino';
import { env } from '../config/env';

export const logger = pino({
  level: env.isProd ? 'info' : 'debug',
  // Never let credentials reach the log stream.
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.body.password',
      'req.body.currentPassword',
      'req.body.newPassword',
      'res.headers["set-cookie"]',
    ],
    remove: true,
  },
  transport: env.isProd ? undefined : { target: 'pino/file', options: { destination: 1 } },
});
