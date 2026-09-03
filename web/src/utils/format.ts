export function formatDate(value: string | Date | null): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatDateTime(value: string | Date | null): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/** Turns #2DD4BF into "45 212 191" for the CSS custom properties. */
export function hexToRgbChannels(hex: string): string | null {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match?.[1]) return null;
  const int = Number.parseInt(match[1], 16);
  return `${(int >> 16) & 255} ${(int >> 8) & 255} ${int & 255}`;
}

export const STATUS_LABEL: Record<string, string> = {
  LIVE: 'Live',
  IN_DEVELOPMENT: 'In development',
  ARCHIVED: 'Archived',
};
