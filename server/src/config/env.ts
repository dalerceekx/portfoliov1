import 'dotenv/config';
import { z } from 'zod';

const bool = (fallback: boolean) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined || v === '' ? fallback : v === 'true' || v === '1'));

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  PUBLIC_SITE_URL: z.string().url().default('http://localhost:5173'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),
  COOKIE_DOMAIN: z.string().optional(),
  COOKIE_SECURE: bool(false),
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_UPLOAD_BYTES: z.coerce.number().int().positive().default(3 * 1024 * 1024),
  /**
   * How many reverse proxies sit between the client and this process. One for the
   * bundled Nginx; two when an AWS ALB or CloudFront terminates TLS in front of it.
   * Too low and every visitor collapses onto the proxy's own address, which turns
   * the per-IP rate limits into a single site-wide bucket — one failed login
   * spree would then lock the admin out of their own panel.
   */
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(10).default(1),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
  // Fail fast and loudly: a misconfigured secret must never boot silently.
  throw new Error(`Invalid environment configuration:\n${issues}`);
}

const raw = parsed.data;

/** Values shipped in `.env.example`, which must never reach a live deployment. */
const PLACEHOLDER_SECRETS = new Set([
  'replace_me_with_a_long_random_string_at_least_32_chars',
  'test_secret_that_is_definitely_long_enough_1234',
]);

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1']);

/**
 * Configuration that parses but is wrong for a public deployment. A mismatch
 * between the site's scheme and the cookie flags is the worst of these: the
 * browser silently discards the session cookie, so login "works" and then every
 * following request is anonymous, with nothing in the logs to explain it.
 */
function auditProduction(cfg: typeof raw) {
  const fatal: string[] = [];
  const warnings: string[] = [];
  const site = new URL(cfg.PUBLIC_SITE_URL);
  const isLocal = LOCAL_HOSTS.has(site.hostname);

  if (PLACEHOLDER_SECRETS.has(cfg.JWT_ACCESS_SECRET)) {
    fatal.push(
      'JWT_ACCESS_SECRET is still the placeholder from .env.example. Generate one with `openssl rand -base64 48`.',
    );
  }
  if (site.protocol === 'https:' && !cfg.COOKIE_SECURE) {
    fatal.push(
      'COOKIE_SECURE must be true when PUBLIC_SITE_URL is https, or the browser will refuse to store the session cookie.',
    );
  }
  if (site.protocol === 'http:' && cfg.COOKIE_SECURE && !isLocal) {
    fatal.push(
      'COOKIE_SECURE is true but PUBLIC_SITE_URL is http. Serve the site over HTTPS or set COOKIE_SECURE=false.',
    );
  }
  if (isLocal) {
    warnings.push(
      `PUBLIC_SITE_URL is ${cfg.PUBLIC_SITE_URL}. Point it at the real domain before going public — CORS, canonical URLs and the CSP all read it.`,
    );
  } else if (site.protocol !== 'https:') {
    warnings.push(
      `PUBLIC_SITE_URL is ${cfg.PUBLIC_SITE_URL}. Serve the admin panel over HTTPS: without it the password and session cookies travel in clear text.`,
    );
  }
  if (cfg.TRUST_PROXY_HOPS === 0) {
    warnings.push(
      'TRUST_PROXY_HOPS is 0. Behind Nginx this makes every request look like it came from the proxy, so per-IP rate limiting stops working.',
    );
  }

  // The logger imports this module, so it cannot be used here.
  for (const w of warnings) console.warn(`[config] WARNING: ${w}`);
  if (fatal.length) {
    throw new Error(`Unsafe production configuration:\n${fatal.map((f) => `  - ${f}`).join('\n')}`);
  }
}

if (raw.NODE_ENV === 'production') auditProduction(raw);

export const env = {
  ...raw,
  isProd: raw.NODE_ENV === 'production',
  isTest: raw.NODE_ENV === 'test',
  corsOrigins: raw.CORS_ORIGIN.split(',')
    .map((o) => o.trim())
    .filter(Boolean),
} as const;

export type Env = typeof env;
