import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Spinner } from './Spinner';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

/**
 * Apple's button: a full pill, regular weight rather than bold, and colour doing
 * the emphasis. No shadow, no border on the filled variant, no glow.
 */
const base =
  'inline-flex items-center justify-center gap-2 rounded-pill font-normal transition-colors duration-200 ease-entrance disabled:cursor-not-allowed disabled:opacity-40 min-h-[44px]';

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-white hover:brightness-[1.08] active:brightness-95',
  secondary: 'bg-black/[0.05] text-graphite hover:bg-black/[0.08] active:bg-black/[0.11]',
  ghost: 'text-link hover:underline',
  danger: 'bg-alert/[0.08] text-alert hover:bg-alert/[0.14]',
};

const sizes: Record<Size, string> = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-[22px] py-3 text-lede',
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'primary', size = 'md', loading = false, icon, children, className = '', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={rest.disabled || loading}
      {...rest}
    >
      {loading ? <Spinner /> : icon}
      {children}
    </button>
  );
});
