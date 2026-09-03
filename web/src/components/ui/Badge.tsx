import type { ReactNode } from 'react';

type Tone = 'neutral' | 'accent' | 'coral' | 'muted';

const tones: Record<Tone, string> = {
  neutral: 'border-hairline bg-black/[0.04] text-slate',
  accent: 'border-accent/30 bg-accent/10 text-accent',
  coral: 'border-alert/30 bg-alert/10 text-alert',
  muted: 'border-hairline bg-transparent text-mute',
};

export function Badge({
  children,
  tone = 'neutral',
  className = '',
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-chip border px-2.5 py-1 text-xs font-medium tracking-tight ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
