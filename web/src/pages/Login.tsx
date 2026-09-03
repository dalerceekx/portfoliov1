import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { TextField } from '../components/ui/Field';
import { Spinner } from '../components/ui/Spinner';
import { useAuth } from '../hooks/useAuth';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { ApiError } from '../api/client';

export function Login() {
  const { admin, loading, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useDocumentMeta({
    title: 'Admin sign in',
    description: 'Administration area.',
    robots: 'noindex, nofollow',
  });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate">
        <Spinner label="Checking session" />
      </div>
    );
  }
  if (admin) return <Navigate to="/admin" replace />;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Could not sign in. Check your connection.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-16">
      <div className="w-full max-w-sm">
        <div className="card rounded-card p-7 shadow-lift">
          <h1 className="text-xl font-semibold text-graphite">Sign in</h1>
          <p className="mt-1 text-sm text-slate">Content management for this site.</p>

          <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
              autoFocus
            />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />

            {error ? (
              <p role="alert" className="rounded-card border border-alert/25 bg-alert/10 px-3 py-2 text-sm text-alert">
                {error}
              </p>
            ) : null}

            <Button type="submit" loading={busy} className="w-full">
              {busy ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </div>

        <p className="mt-5 text-center text-xs text-mute">
          Five failed attempts lock the account for 15 minutes.
        </p>
      </div>
    </main>
  );
}
