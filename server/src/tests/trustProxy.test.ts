import express from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * Client IP resolution is what the per-IP rate limits are built on. Behind an
 * ALB the forwarded chain gains a hop, and counting it wrong silently collapses
 * every visitor onto the proxy's address — at which point five failed logins
 * from anyone lock the admin out of their own panel. These tests pin the
 * relationship between TRUST_PROXY_HOPS and the address Express settles on.
 */
async function ipBehind(hops: string, forwardedFor: string): Promise<string> {
  vi.resetModules();
  vi.stubEnv('TRUST_PROXY_HOPS', hops);

  const { createApp } = await import('../app');
  const probe = express();
  // Read the setting back off the real app rather than restating it.
  probe.set('trust proxy', createApp().get('trust proxy'));
  probe.get('/ip', (req, res) => {
    res.json({ ip: req.ip });
  });

  const res = await request(probe).get('/ip').set('X-Forwarded-For', forwardedFor);
  return res.body.ip as string;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('TRUST_PROXY_HOPS', () => {
  it('resolves the client through one proxy (bundled Nginx only)', async () => {
    // Nginx appends its own peer, so the chain it forwards is "client, nginx-peer".
    await expect(ipBehind('1', '203.0.113.42, 10.0.0.9')).resolves.toBe('10.0.0.9');
  });

  it('resolves the client through two proxies (ALB in front of Nginx)', async () => {
    // The ALB records the client, Nginx appends the ALB: "client, alb".
    await expect(ipBehind('2', '203.0.113.42, 10.0.0.9')).resolves.toBe('203.0.113.42');
  });

  it('ignores a forwarded header nobody is trusted to have set', async () => {
    const ip = await ipBehind('0', '203.0.113.42, 10.0.0.9');
    expect(ip).not.toBe('203.0.113.42');
  });
});
