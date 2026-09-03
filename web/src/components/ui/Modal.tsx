import { useEffect, useRef, type ReactNode } from 'react';
import { Button } from './Button';

interface Props {
  open: boolean;
  title: string;
  body: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: 'primary' | 'danger';
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Focus is moved in on open and returned on close; Escape always cancels. */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel = 'Cancel',
  tone = 'danger',
  busy = false,
  onConfirm,
  onCancel,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    restoreTo.current = document.activeElement as HTMLElement | null;
    panelRef.current?.querySelector<HTMLElement>('button')?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
      if (event.key !== 'Tab') return;
      const focusables = panelRef.current?.querySelectorAll<HTMLElement>('button, [href], input');
      if (!focusables || focusables.length === 0) return;
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      restoreTo.current?.focus();
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-obsidian/40 backdrop-blur-sm animate-fade"
        onClick={onCancel}
        aria-hidden
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="card relative w-full max-w-md rounded-card p-6 shadow-lift animate-rise"
      >
        <h2 id="confirm-title" className="text-xl font-semibold text-graphite">
          {title}
        </h2>
        <div className="mt-2 text-sm leading-relaxed text-slate">{body}</div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button
            variant={tone === 'danger' ? 'danger' : 'primary'}
            size="sm"
            onClick={onConfirm}
            loading={busy}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
