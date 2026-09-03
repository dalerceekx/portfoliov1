type IconProps = { className?: string };

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export const ArrowUpRight = ({ className = 'h-4 w-4' }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden {...stroke}>
    <path d="M7 17 17 7M8 7h9v9" />
  </svg>
);

export const ArrowUp = ({ className = 'h-4 w-4' }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden {...stroke}>
    <path d="M12 19V5M5 12l7-7 7 7" />
  </svg>
);

export const Menu = ({ className = 'h-5 w-5' }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden {...stroke}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);

export const Close = ({ className = 'h-5 w-5' }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden {...stroke}>
    <path d="m6 6 12 12M18 6 6 18" />
  </svg>
);

export const Mail = ({ className = 'h-4 w-4' }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden {...stroke}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3.5 7 8.5 6 8.5-6" />
  </svg>
);

export const Pin = ({ className = 'h-4 w-4' }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden {...stroke}>
    <path d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11Z" />
    <circle cx="12" cy="10" r="2.4" />
  </svg>
);

export const Trash = ({ className = 'h-4 w-4' }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden {...stroke}>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
  </svg>
);

export const Pencil = ({ className = 'h-4 w-4' }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden {...stroke}>
    <path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3Z" />
  </svg>
);

export const Plus = ({ className = 'h-4 w-4' }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden {...stroke}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

/** Brand marks are drawn as generic glyphs so no third-party asset is bundled. */
export const socialGlyph = (platform: string): string => {
  const key = platform.toLowerCase();
  if (key.includes('github')) return 'GH';
  if (key.includes('telegram')) return 'TG';
  if (key.includes('linkedin')) return 'IN';
  if (key.includes('instagram')) return 'IG';
  if (key.includes('x') || key.includes('twitter')) return 'X';
  if (key.includes('youtube')) return 'YT';
  if (key.includes('dribbble')) return 'DR';
  if (key.includes('behance')) return 'BE';
  return platform.slice(0, 2).toUpperCase();
};
