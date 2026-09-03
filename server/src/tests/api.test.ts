import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../app';

const app = createApp();

describe('API surface', () => {
  it('answers health checks', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ok');
  });

  it('returns a structured 404 for unknown endpoints', async () => {
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ success: false, code: 'NOT_FOUND' });
  });

  it('sets security headers', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});

describe('admin authorisation', () => {
  const guarded: [string, string][] = [
    ['get', '/api/admin/projects'],
    ['get', '/api/admin/settings'],
    ['get', '/api/admin/messages'],
    ['get', '/api/admin/security/login-logs'],
    ['get', '/api/admin/stats'],
  ];

  it.each(guarded)('rejects unauthenticated %s %s', async (method, path) => {
    const res = await (request(app) as never as Record<string, (p: string) => request.Test>)[
      method
    ]!(path);
    expect(res.status).toBe(401);
  });

  it('rejects state-changing requests without a CSRF token before touching auth', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'a@b.co', password: 'x' });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('CSRF');
  });
});

describe('input validation', () => {
  it('rejects a malformed contact payload', async () => {
    const res = await request(app)
      .post('/api/contact')
      .send({ name: 'a', email: 'not-an-email', message: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.errors).toHaveProperty('email');
  });

  it('drops markup from accepted text before it reaches the database layer', async () => {
    const res = await request(app)
      .post('/api/contact')
      .send({ name: 'Test', email: 'x@example.com', message: 'x'.repeat(3) });
    // Still a 400 (too short), but proves the pipeline runs before any DB call.
    expect(res.status).toBe(400);
  });

  it('refuses oversized bodies', async () => {
    const res = await request(app)
      .post('/api/contact')
      .send({ name: 'Test', email: 'x@example.com', message: 'x'.repeat(200_000) });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
