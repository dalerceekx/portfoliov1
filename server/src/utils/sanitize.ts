/**
 * Project descriptions and settings are plain text by design (see the XSS rules
 * in the brief): we strip anything that looks like markup instead of trying to
 * sanitise an allow-list of HTML. React escapes on render, this is defence in depth.
 */
export function stripTags(input: string): string {
  return input
    .replace(/<\/?[^>]*>/g, '')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
    .trim();
}

const SAFE_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);

/** Rejects javascript:, data:, vbscript: and other script-bearing URL schemes. */
export function assertSafeUrl(value: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error('Enter a full URL, including https://');
  }
  if (!SAFE_PROTOCOLS.has(parsed.protocol)) {
    throw new Error('Only http, https and mailto links are allowed.');
  }
  return parsed.toString();
}

/** Site-relative upload paths are allowed alongside absolute http(s) URLs. */
export function assertSafeImagePath(value: string): string {
  if (value.startsWith('/uploads/')) {
    if (value.includes('..')) throw new Error('Invalid image path.');
    return value;
  }
  const parsed = new URL(value);
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('Image URL must be http or https.');
  }
  return parsed.toString();
}
