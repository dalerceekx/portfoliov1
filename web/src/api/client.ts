/**
 * Single API layer. Components never call fetch() directly, and the CSRF token
 * is held in memory only — never in localStorage.
 */
const BASE = import.meta.env.VITE_API_URL ?? '/api';

let csrfToken: string | null = null;

export const setCsrfToken = (token: string | null) => {
  csrfToken = token;
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields?: Record<string, string>;

  constructor(status: number, message: string, code: string, fields?: Record<string, string>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

type Options = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
  formData?: FormData;
};

async function ensureCsrf(): Promise<string> {
  if (csrfToken) return csrfToken;
  const res = await fetch(`${BASE}/auth/csrf`, { credentials: 'include' });
  if (!res.ok) throw new ApiError(res.status, 'Could not start a secure session.', 'CSRF');
  const json = (await res.json()) as { data: { csrfToken: string } };
  csrfToken = json.data.csrfToken;
  return csrfToken;
}

async function parse<T>(res: Response): Promise<T> {
  const text = await res.text();
  const json = text ? (JSON.parse(text) as Record<string, unknown>) : {};

  if (!res.ok) {
    throw new ApiError(
      res.status,
      typeof json.message === 'string' ? json.message : 'Something went wrong.',
      typeof json.code === 'string' ? json.code : 'ERROR',
      (json.errors as Record<string, string> | undefined) ?? undefined,
    );
  }
  return (json as { data: T }).data;
}

/** Endpoints that must never trigger the refresh retry, or it would recurse. */
const NO_REFRESH = new Set(['/auth/refresh', '/auth/login', '/auth/logout', '/auth/csrf']);

let refreshing: Promise<boolean> | null = null;

/**
 * Rotates the session cookies. Single-flight: several requests failing at once
 * share one refresh instead of racing each other into revoked tokens.
 */
function refreshSession(): Promise<boolean> {
  refreshing ??= (async () => {
    try {
      const res = await fetch(`${BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'X-CSRF-Token': await ensureCsrf() },
      });
      if (!res.ok) return false;
      const json = (await res.json()) as { data?: { csrfToken?: string } };
      if (json.data?.csrfToken) csrfToken = json.data.csrfToken;
      return true;
    } catch {
      return false;
    } finally {
      // Cleared on the next tick so callers awaiting this round all see it.
      setTimeout(() => {
        refreshing = null;
      }, 0);
    }
  })();
  return refreshing;
}

export async function apiRequest<T>(path: string, options: Options = {}): Promise<T> {
  const method = options.method ?? 'GET';
  const headers: Record<string, string> = {};

  if (method !== 'GET') headers['X-CSRF-Token'] = await ensureCsrf();
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';

  const send = () =>
    fetch(`${BASE}${path}`, {
      method,
      credentials: 'include',
      headers,
      signal: options.signal,
      body: options.formData ?? (options.body === undefined ? undefined : JSON.stringify(options.body)),
    });

  let res = await send();

  // One silent retry: an expired CSRF cookie should not cost the user their form.
  if (res.status === 403 && method !== 'GET') {
    csrfToken = null;
    headers['X-CSRF-Token'] = await ensureCsrf();
    res = await send();
  }

  // The access cookie lives 15 minutes. A 401 on a longer-lived admin session
  // means it simply aged out, so rotate it once and replay the original call
  // rather than making the user log in again mid-edit.
  if (res.status === 401 && !NO_REFRESH.has(path)) {
    if (await refreshSession()) {
      if (method !== 'GET') headers['X-CSRF-Token'] = await ensureCsrf();
      res = await send();
    }
  }

  return parse<T>(res);
}
