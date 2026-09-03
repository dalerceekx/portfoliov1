import type { Request } from 'express';

/** Trust proxy is enabled in app.ts, so req.ip already resolves X-Forwarded-For. */
export function clientIp(req: Request): string {
  return req.ip ?? req.socket.remoteAddress ?? 'unknown';
}

export function userAgent(req: Request): string {
  return (req.get('user-agent') ?? 'unknown').slice(0, 255);
}
