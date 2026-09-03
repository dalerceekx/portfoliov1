import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { authService } from '../services/authService';
import type { AdminUser } from '../types';

type AuthState = {
  admin: AdminUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    // The access cookie is httpOnly, so the only way to know whether a session
    // exists is to ask the server; a 401 falls back to a refresh attempt.
    (async () => {
      try {
        const me = await authService.me();
        if (!cancelled) setAdmin(me);
      } catch {
        try {
          const refreshed = await authService.refresh();
          if (!cancelled) setAdmin(refreshed);
        } catch {
          if (!cancelled) setAdmin(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setAdmin(await authService.login(email, password));
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setAdmin(null);
  }, []);

  const value = useMemo(() => ({ admin, loading, login, logout }), [admin, loading, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
