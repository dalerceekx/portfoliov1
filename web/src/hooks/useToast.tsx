import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

type Toast = { id: number; message: string; tone: 'success' | 'error' };
type ToastApi = { notify: (message: string, tone?: Toast['tone']) => void };

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const notify = useCallback((message: string, tone: Toast['tone'] = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, message, tone }]);
    window.setTimeout(() => setToasts((current) => current.filter((t) => t.id !== id)), 4200);
  }, []);

  const api = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex flex-col items-center gap-2 px-4"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`card pointer-events-auto flex items-center gap-3 rounded-card px-4 py-3 text-sm shadow-lift animate-rise ${
              toast.tone === 'error' ? 'text-alert' : 'text-graphite'
            }`}
          >
            <span
              aria-hidden
              className={`h-1.5 w-1.5 rounded-pill ${toast.tone === 'error' ? 'bg-alert' : 'bg-accent'}`}
            />
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside ToastProvider');
  return context;
}
