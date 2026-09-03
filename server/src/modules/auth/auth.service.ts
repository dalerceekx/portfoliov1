import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/http';
import { hashPassword, verifyPassword } from './password';
import { revokeAllForAdmin } from './tokens';

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

/** Identical message for every failure so the endpoint cannot be used to enumerate accounts. */
const GENERIC = 'Invalid credentials.';

type Attempt = { email: string; ip: string; userAgent: string };

async function log(
  success: boolean,
  attempt: Attempt,
  adminId: string | null,
  reason: string | null,
) {
  await prisma.loginLog.create({
    data: {
      adminId,
      email: attempt.email,
      ip: attempt.ip,
      userAgent: attempt.userAgent,
      success,
      reason,
    },
  });
}

export async function authenticate(email: string, password: string, attempt: Attempt) {
  const admin = await prisma.admin.findUnique({ where: { email } });

  if (!admin) {
    // Spend comparable time on a missing account to blunt timing analysis.
    await verifyPassword(
      '$argon2id$v=19$m=19456,t=2,p=1$c29tZXNhbHR2YWx1ZQ$0000000000000000000000000000000000000000000',
      password,
    );
    await log(false, attempt, null, 'unknown_account');
    throw AppError.unauthorized(GENERIC);
  }

  if (admin.lockedUntil && admin.lockedUntil > new Date()) {
    await log(false, attempt, admin.id, 'locked');
    throw new AppError(
      423,
      `Account locked. Try again in ${LOCK_MINUTES} minutes.`,
      'ACCOUNT_LOCKED',
    );
  }

  const valid = await verifyPassword(admin.passwordHash, password);

  if (!valid) {
    const attempts = admin.failedLoginAttempts + 1;
    const lock = attempts >= MAX_ATTEMPTS;
    await prisma.admin.update({
      where: { id: admin.id },
      data: {
        failedLoginAttempts: lock ? 0 : attempts,
        lockedUntil: lock ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000) : null,
      },
    });
    await log(false, attempt, admin.id, lock ? 'locked_out' : 'bad_password');
    if (lock) {
      throw new AppError(
        423,
        `Too many failed attempts. Account locked for ${LOCK_MINUTES} minutes.`,
        'ACCOUNT_LOCKED',
      );
    }
    throw AppError.unauthorized(GENERIC);
  }

  await prisma.admin.update({
    where: { id: admin.id },
    data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
  });
  await log(true, attempt, admin.id, null);

  return { id: admin.id, email: admin.email, role: admin.role, name: admin.name };
}

export async function changePassword(adminId: string, current: string, next: string) {
  const admin = await prisma.admin.findUnique({ where: { id: adminId } });
  if (!admin) throw AppError.unauthorized();

  const valid = await verifyPassword(admin.passwordHash, current);
  if (!valid) throw AppError.badRequest('Current password is incorrect.');

  await prisma.admin.update({
    where: { id: adminId },
    data: { passwordHash: await hashPassword(next) },
  });
  // Every other session is dropped after a password change.
  await revokeAllForAdmin(adminId);
}
