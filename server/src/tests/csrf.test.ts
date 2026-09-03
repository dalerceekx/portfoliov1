import { describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import { csrfProtection } from '../middleware/csrf';

const req = (method: string, cookie?: string, header?: string) =>
  ({
    method,
    cookies: cookie ? { pf_csrf: cookie } : {},
    get: (name: string) => (name.toLowerCase() === 'x-csrf-token' ? header : undefined),
  }) as unknown as Request;

const res = {} as Response;

describe('csrfProtection', () => {
  it('lets safe methods through', () => {
    const next = vi.fn();
    csrfProtection(req('GET'), res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('rejects a state-changing request with no token', () => {
    const next = vi.fn();
    csrfProtection(req('POST'), res, next);
    expect(next.mock.calls[0]?.[0]).toBeInstanceOf(Error);
  });

  it('rejects a mismatched token', () => {
    const next = vi.fn();
    csrfProtection(req('DELETE', 'aaa', 'bbb'), res, next);
    expect(next.mock.calls[0]?.[0]).toBeInstanceOf(Error);
  });

  it('accepts a matching token', () => {
    const next = vi.fn();
    csrfProtection(req('PATCH', 'same-token', 'same-token'), res, next);
    expect(next).toHaveBeenCalledWith();
  });
});
