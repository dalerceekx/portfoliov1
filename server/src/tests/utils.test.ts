import { describe, expect, it } from 'vitest';
import { slugify, uniqueSlug } from '../utils/slug';
import { assertSafeUrl, assertSafeImagePath, stripTags } from '../utils/sanitize';

describe('slugify', () => {
  it('normalises titles into url-safe slugs', () => {
    expect(slugify('Support  Chat Widget!')).toBe('support-chat-widget');
  });

  it('transliterates cyrillic', () => {
    expect(slugify('Ташкент')).toBe('tashkent');
  });

  it('never returns leading or trailing hyphens', () => {
    expect(slugify('  --hello--  ')).toBe('hello');
  });
});

describe('uniqueSlug', () => {
  it('suffixes until the slug is free', async () => {
    const used = new Set(['api', 'api-2']);
    await expect(uniqueSlug('API', async (s) => used.has(s))).resolves.toBe('api-3');
  });
});

describe('stripTags', () => {
  it('removes markup from user text', () => {
    expect(stripTags('<img src=x onerror=alert(1)>hello')).toBe('hello');
    expect(stripTags('<script>bad()</script>ok')).toBe('bad()ok');
  });
});

describe('assertSafeUrl', () => {
  it('accepts http, https and mailto', () => {
    expect(assertSafeUrl('https://example.uz')).toContain('https://example.uz');
    expect(assertSafeUrl('mailto:hi@example.com')).toBe('mailto:hi@example.com');
  });

  it('rejects script-bearing schemes', () => {
    expect(() => assertSafeUrl('javascript:alert(1)')).toThrow();
    expect(() => assertSafeUrl('data:text/html;base64,PHNjcmlwdD4=')).toThrow();
    expect(() => assertSafeUrl('not-a-url')).toThrow();
  });
});

describe('assertSafeImagePath', () => {
  it('allows managed upload paths', () => {
    expect(assertSafeImagePath('/uploads/abc.webp')).toBe('/uploads/abc.webp');
  });

  it('blocks traversal', () => {
    expect(() => assertSafeImagePath('/uploads/../../etc/passwd')).toThrow();
  });
});
