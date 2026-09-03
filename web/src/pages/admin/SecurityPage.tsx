import { useCallback, useState, type FormEvent } from 'react';
import { useAsync } from '../../hooks/useAsync';
import { useToast } from '../../hooks/useToast';
import { dashboardService } from '../../services/contactService';
import { authService } from '../../services/authService';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { TextField } from '../../components/ui/Field';
import { formatDateTime } from '../../utils/format';

const REASON_LABEL: Record<string, string> = {
  unknown_account: 'No such account',
  bad_password: 'Wrong password',
  locked: 'Account locked',
  locked_out: 'Locked after repeated failures',
};

function ChangePassword() {
  const { notify } = useToast();
  const { logout } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const strong =
    next.length >= 12 && /[A-Z]/.test(next) && /[0-9]/.test(next) && /[^A-Za-z0-9]/.test(next);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!strong) {
      setError(
        'Use at least 12 characters with an uppercase letter, a number and a special character.',
      );
      return;
    }
    setBusy(true);
    try {
      await authService.changePassword(current, next);
      notify('Password changed. Sign in again.');
      await logout().catch(() => undefined);
      window.location.assign('/admin/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change the password.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card space-y-4 rounded-card p-5 sm:p-6">
      <h2 className="text-base font-semibold text-graphite">Change password</h2>
      <p className="text-sm text-slate">
        Changing the password signs out every other session immediately.
      </p>
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <TextField
          label="Current password"
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          autoComplete="current-password"
          required
        />
        <TextField
          label="New password"
          type="password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          autoComplete="new-password"
          hint="At least 12 characters, one uppercase letter, one number, one symbol."
          required
        />
        {error ? (
          <p role="alert" className="text-sm text-alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" loading={busy} disabled={!current || !next}>
          {busy ? 'Updating…' : 'Update password'}
        </Button>
      </form>
    </section>
  );
}

export function SecurityPage() {
  const load = useCallback((signal: AbortSignal) => dashboardService.loginLogs(signal), []);
  const { data, loading, error, reload } = useAsync(load);

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold text-graphite">Security</h1>

      <ChangePassword />

      <section className="card rounded-card p-5 sm:p-6">
        <h2 className="text-base font-semibold text-graphite">Sign-in activity</h2>
        <p className="mt-1 text-sm text-slate">The last 100 attempts, newest first.</p>

        {loading ? (
          <div className="flex justify-center py-12 text-slate">
            <Spinner label="Loading log" />
          </div>
        ) : error ? (
          <div className="py-8 text-center">
            <p className="text-graphite">{error}</p>
            <Button variant="secondary" size="sm" className="mt-4" onClick={reload}>
              Try again
            </Button>
          </div>
        ) : (data?.length ?? 0) === 0 ? (
          <p className="py-8 text-center text-sm text-slate">Nothing recorded yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-hairline">
            {data!.map((log) => (
              <li key={log.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge tone={log.success ? 'accent' : 'coral'}>
                      {log.success ? 'Success' : 'Failed'}
                    </Badge>
                    <span className="truncate text-sm text-graphite">{log.email}</span>
                  </div>
                  <p className="mt-1 truncate text-xs text-mute">
                    {log.ip ?? 'unknown IP'}
                    {log.reason ? ` · ${REASON_LABEL[log.reason] ?? log.reason}` : ''}
                  </p>
                </div>
                <span className="text-xs text-slate">{formatDateTime(log.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
