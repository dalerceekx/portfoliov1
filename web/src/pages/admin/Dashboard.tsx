import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAsync } from '../../hooks/useAsync';
import { dashboardService } from '../../services/contactService';
import { Spinner } from '../../components/ui/Spinner';
import { Button } from '../../components/ui/Button';
import { formatDateTime } from '../../utils/format';

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card rounded-card p-5">
      <p className="text-sm text-slate">{label}</p>
      <p className="mt-1.5 text-3xl font-semibold text-graphite">{value}</p>
    </div>
  );
}

export function Dashboard() {
  const load = useCallback((signal: AbortSignal) => dashboardService.stats(signal), []);
  const { data, loading, error, reload } = useAsync(load);

  if (loading)
    return (
      <div className="flex justify-center py-20 text-slate">
        <Spinner label="Loading dashboard" />
      </div>
    );

  if (error || !data)
    return (
      <div className="card rounded-card p-8 text-center">
        <p className="text-graphite">{error ?? 'Dashboard unavailable.'}</p>
        <Button variant="secondary" size="sm" className="mt-4" onClick={reload}>
          Try again
        </Button>
      </div>
    );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-graphite">Dashboard</h1>
        <Link
          to="/admin/projects/new"
          className="inline-flex min-h-[44px] items-center rounded-pill bg-accent px-5 text-sm font-medium text-canvas shadow-lift transition-all hover:shadow-raise"
        >
          New project
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Projects" value={data.projects.total} />
        <Stat label="Published" value={data.projects.published} />
        <Stat label="Drafts" value={data.projects.drafts} />
        <Stat label="Unread messages" value={data.messages.unread} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card rounded-card p-5">
          <h2 className="text-base font-semibold text-graphite">Content</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate">Featured projects</dt>
              <dd className="text-graphite">{data.projects.featured}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate">Last project update</dt>
              <dd className="text-graphite">{formatDateTime(data.projects.lastUpdated)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate">Messages received</dt>
              <dd className="text-graphite">{data.messages.total}</dd>
            </div>
          </dl>
        </section>

        <section className="card rounded-card p-5">
          <h2 className="text-base font-semibold text-graphite">Recent sign-in activity</h2>
          {data.recentLogins.length === 0 ? (
            <p className="mt-4 text-sm text-slate">No sign-in attempts recorded yet.</p>
          ) : (
            <ul className="mt-4 space-y-2.5">
              {data.recentLogins.map((log) => (
                <li key={log.id} className="flex items-center justify-between gap-4 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      aria-hidden
                      className={`h-1.5 w-1.5 shrink-0 rounded-pill ${log.success ? 'bg-accent' : 'bg-alert'}`}
                    />
                    <span className="truncate text-graphite">{log.email}</span>
                    <span className="sr-only">{log.success ? 'succeeded' : 'failed'}</span>
                  </span>
                  <span className="shrink-0 text-slate">{formatDateTime(log.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
          <Link
            to="/admin/security"
            className="mt-4 inline-block text-sm text-accent transition-opacity hover:opacity-80"
          >
            View full log
          </Link>
        </section>
      </div>
    </div>
  );
}
