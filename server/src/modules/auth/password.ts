import { hash, verify, Algorithm } from '@node-rs/argon2';

/** OWASP-recommended Argon2id parameters (19 MiB, t=2, p=1). */
const OPTIONS = {
  algorithm: Algorithm.Argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

export const hashPassword = (plain: string) => hash(plain, OPTIONS);

export async function verifyPassword(digest: string, plain: string): Promise<boolean> {
  try {
    return await verify(digest, plain, OPTIONS);
  } catch {
    return false;
  }
}

export const PASSWORD_RULES = {
  minLength: 12,
  message:
    'Password must be at least 12 characters and include an uppercase letter, a number and a special character.',
};

export function isStrongPassword(value: string): boolean {
  return (
    value.length >= PASSWORD_RULES.minLength &&
    /[A-Z]/.test(value) &&
    /[0-9]/.test(value) &&
    /[^A-Za-z0-9]/.test(value)
  );
}
