import { useScrolled } from '../../hooks/useScrolled';
import { ArrowUp } from '../ui/Icons';

export function BackToTop() {
  const visible = useScrolled(600);

  return (
    <button
      type="button"
      aria-label="Back to top"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      tabIndex={visible ? 0 : -1}
      className={`fixed bottom-6 right-5 z-40 flex h-11 w-11 items-center justify-center rounded-pill border border-hairline bg-canvas/90 text-graphite shadow-lift backdrop-blur transition-all duration-400 ease-entrance hover:bg-surface sm:right-8 ${
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0'
      }`}
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
}
