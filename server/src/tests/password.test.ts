import { describe, expect, it } from 'vitest';
import { hashPassword, isStrongPassword, verifyPassword } from '../modules/auth/password';

describe('password policy', () => {
  it('requires length, uppercase, digit and symbol', () => {
    expect(isStrongPassword('short1!A')).toBe(false);
    expect(isStrongPassword('alllowercase1!')).toBe(false);
    expect(isStrongPassword('NoDigitsHere!!')).toBe(false);
    expect(isStrongPassword('NoSymbols12345')).toBe(false);
    expect(isStrongPassword('Str0ng-Enough!2026')).toBe(true);
  });
});

describe('argon2id hashing', () => {
  it('verifies a correct password and rejects a wrong one', async () => {
    const digest = await hashPassword('Str0ng-Enough!2026');
    expect(digest.startsWith('$argon2id$')).toBe(true);
    await expect(verifyPassword(digest, 'Str0ng-Enough!2026')).resolves.toBe(true);
    await expect(verifyPassword(digest, 'Str0ng-Enough!2027')).resolves.toBe(false);
  });

  it('never returns true for a malformed digest', async () => {
    await expect(verifyPassword('not-a-hash', 'anything')).resolves.toBe(false);
  });
});
