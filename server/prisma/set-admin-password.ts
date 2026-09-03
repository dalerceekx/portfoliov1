import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { hashPassword, isStrongPassword, PASSWORD_RULES } from '../src/modules/auth/password';

/**
 * Resets the admin password from the shell. `npm run seed` deliberately leaves an
 * existing admin untouched, so this is the way to rotate a password that was set
 * from a placeholder — or recover one that was lost.
 *
 *   npm run admin:password -- 'the-new-password'
 *
 * Falls back to SEED_ADMIN_PASSWORD when no argument is given.
 */
const prisma = new PrismaClient();

async function main() {
  const password = process.argv[2] ?? process.env.SEED_ADMIN_PASSWORD ?? '';
  const email = (process.env.SEED_ADMIN_EMAIL ?? '').trim().toLowerCase();

  if (!email) throw new Error('Set SEED_ADMIN_EMAIL in .env first.');
  if (!isStrongPassword(password)) throw new Error(PASSWORD_RULES.message);

  const admin = await prisma.admin.update({
    where: { email },
    // A reset also clears any lockout, otherwise a locked-out admin stays locked out.
    data: { passwordHash: await hashPassword(password), failedLoginAttempts: 0, lockedUntil: null },
  });

  // Every existing session is dropped, exactly as an in-app password change does.
  const revoked = await prisma.refreshToken.updateMany({
    where: { adminId: admin.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  console.log(`Password updated for ${admin.email} (${revoked.count} session(s) revoked)`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
