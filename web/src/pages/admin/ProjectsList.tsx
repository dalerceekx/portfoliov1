import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAsync } from '../../hooks/useAsync';
import { useToast } from '../../hooks/useToast';
import { projectService } from '../../services/projectService';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { ConfirmDialog } from '../../components/ui/Modal';
import { Pencil, Trash } from '../../components/ui/Icons';
import { formatDate, hostname, STATUS_LABEL } from '../../utils/format';
import type { AdminProject } from '../../types';

export function ProjectsList() {
  const load = useCallback((signal: AbortSignal) => projectService.listAdmin(signal), []);
  const { data, loading, error, reload } = useAsync(load);
  const { notify } = useToast();
  const [pendingDelete, setPendingDelete] = useState<AdminProject | null>(null);
  const [busy, setBusy] = useState(false);

  async function confirmDelete() {
    if (!pendingDelete) return;
    setBusy(true);
    try {
      await projectService.remove(pendingDelete.id);
      notify(`Deleted "${pendingDelete.title}".`);
      setPendingDelete(null);
      reload();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not delete this project.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function togglePublished(project: AdminProject) {
    try {
      await projectService.update(project.id, { published: !project.published });
      notify(project.published ? 'Moved to drafts.' : 'Published.');
      reload();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not update this project.', 'error');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-graphite">Projects</h1>
        <Link
          to="/admin/projects/new"
          className="inline-flex min-h-[44px] items-center rounded-pill bg-accent px-5 text-sm font-medium text-canvas shadow-lift transition-all hover:shadow-raise"
        >
          New project
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-20 text-slate">
          <Spinner label="Loading projects" />
        </div>
      ) : error ? (
        <div className="card rounded-card p-8 text-center">
          <p className="text-graphite">{error}</p>
          <Button variant="secondary" size="sm" className="mt-4" onClick={reload}>
            Try again
          </Button>
        </div>
      ) : (data?.length ?? 0) === 0 ? (
        <div className="card rounded-card px-6 py-16 text-center">
          <p className="text-lg font-semibold text-graphite">No projects yet</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-slate">
            Add the first site or product you want listed on the front page.
          </p>
          <Link
            to="/admin/projects/new"
            className="mt-6 inline-flex min-h-[44px] items-center rounded-pill bg-accent px-5 text-sm font-medium text-canvas"
          >
            Add a project
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {data!.map((project) => (
            <li key={project.id} className="card rounded-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold text-graphite">{project.title}</h2>
                    <Badge tone={project.published ? 'accent' : 'muted'}>
                      {project.published ? 'Published' : 'Draft'}
                    </Badge>
                    {project.featured ? <Badge tone="coral">Featured</Badge> : null}
                    <Badge>{STATUS_LABEL[project.status] ?? project.status}</Badge>
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-sm text-slate">{project.description}</p>
                  <p className="mt-2 text-xs text-mute">
                    {project.url ? `${hostname(project.url)} · ` : 'No link · '}
                    {project.category} · updated {formatDate(project.updatedAt)}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => togglePublished(project)}>
                    {project.published ? 'Unpublish' : 'Publish'}
                  </Button>
                  <Link
                    to={`/admin/projects/${project.id}`}
                    aria-label={`Edit ${project.title}`}
                    className="card flex h-11 w-11 items-center justify-center rounded-card text-slate transition-colors hover:text-graphite"
                  >
                    <Pencil />
                  </Link>
                  <button
                    type="button"
                    onClick={() => setPendingDelete(project)}
                    aria-label={`Delete ${project.title}`}
                    className="flex h-11 w-11 items-center justify-center rounded-card border border-alert/25 text-alert transition-colors hover:bg-alert/10"
                  >
                    <Trash />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this project?"
        body={
          <>
            <strong className="text-graphite">{pendingDelete?.title}</strong> will be removed from the
            site. This action cannot be undone.
          </>
        }
        confirmLabel="Delete"
        busy={busy}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
