import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { prisma } from '../../lib/prisma';

export type AccessPayload = { sub: string; role: string };

export function signAccessToken(payload: AccessPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_TTL_SECONDS,
    issuer: 'portfolio-api',
  });
}

export function verifyAccessToken(token: string): AccessPayload | null {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, { issuer: 'portfolio-api' });
    if (typeof decoded === 'string') return null;
    const { sub, role } = decoded as jwt.JwtPayload & { role?: string };
    if (typeof sub !== 'string' || typeof role !== 'string') return null;
    return { sub, role };
  } catch {
    return null;
  }
}

const sha256 = (value: string) => crypto.createHash('sha256').update(value).digest('hex');

/** Issues an opaque refresh token; only its hash is persisted. */
export async function issueRefreshToken(adminId: string) {
  const token = crypto.randomBytes(48).toString('base64url');
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({
    data: { adminId, tokenHash: sha256(token), expiresAt },
  });
  return { token, expiresAt };
}

export async function consumeRefreshToken(token: string) {
  const record = await prisma.refreshToken.findUnique({
    where: { tokenHash: sha256(token) },
    include: { admin: true },
  });
  if (!record || record.revokedAt || record.expiresAt < new Date()) return null;
  // Rotation: the presented token is burned immediately.
  await prisma.refreshToken.update({
    where: { id: record.id },
    data: { revokedAt: new Date() },
  });
  return record;
}

export async function revokeRefreshToken(token: string) {
  await prisma.refreshToken.updateMany({
    where: { tokenHash: sha256(token), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllForAdmin(adminId: string) {
  await prisma.refreshToken.updateMany({
    where: { adminId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export const newCsrfToken = () => crypto.randomBytes(32).toString('base64url');

/** Constant-time comparison so CSRF checks leak no timing information. */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
