import { useCallback, useState } from 'react';
import { useAsync } from '../../hooks/useAsync';
import { useToast } from '../../hooks/useToast';
import { contactService } from '../../services/contactService';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { ConfirmDialog } from '../../components/ui/Modal';
import { Trash } from '../../components/ui/Icons';
import { formatDateTime } from '../../utils/format';
import type { ContactMessage } from '../../types';

export function MessagesPage() {
  const load = useCallback((signal: AbortSignal) => contactService.list(signal), []);
  const { data, loading, error, reload } = useAsync(load);
  const { notify } = useToast();
  const [pending, setPending] = useState<ContactMessage | null>(null);
  const [busy, setBusy] = useState(false);

  async function toggleRead(message: ContactMessage) {
    try {
      await contactService.toggleRead(message.id);
      reload();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not update this message.', 'error');
    }
  }

  async function confirmDelete() {
    if (!pending) return;
    setBusy(true);
    try {
      await contactService.remove(pending.id);
      notify('Message deleted.');
      setPending(null);
      reload();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not delete this message.', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-graphite">Messages</h1>
        {data && data.unread > 0 ? <Badge tone="accent">{data.unread} unread</Badge> : null}
      </div>

      {loading ? (
        <div className="flex justify-center py-20 text-slate">
          <Spinner label="Loading messages" />
        </div>
      ) : error ? (
        <div className="card rounded-card p-8 text-center">
          <p className="text-graphite">{error}</p>
          <Button variant="secondary" size="sm" className="mt-4" onClick={reload}>
            Try again
          </Button>
        </div>
      ) : (data?.messages.length ?? 0) === 0 ? (
        <div className="card rounded-card px-6 py-16 text-center">
          <p className="text-lg font-semibold text-graphite">No messages yet</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-slate">
            Anything sent through the contact form on the front page lands here.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {data!.messages.map((message) => (
            <li
              key={message.id}
              className={`card rounded-card p-5 ${message.readAt ? 'opacity-70' : ''}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-graphite">{message.name}</p>
                    {!message.readAt ? <Badge tone="accent">New</Badge> : null}
                  </div>
                  <a
                    href={`mailto:${message.email}`}
                    className="text-sm text-accent transition-opacity hover:opacity-80"
                  >
                    {message.email}
                  </a>
                  {message.subject ? (
                    <p className="mt-2 text-sm font-medium text-graphite">{message.subject}</p>
                  ) : null}
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate">
                    {message.message}
                  </p>
                  <p className="mt-3 text-xs text-mute">{formatDateTime(message.createdAt)}</p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => toggleRead(message)}>
                    {message.readAt ? 'Mark unread' : 'Mark read'}
                  </Button>
                  <button
                    type="button"
                    onClick={() => setPending(message)}
                    aria-label={`Delete message from ${message.name}`}
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
        open={pending !== null}
        title="Delete this message?"
        body={<>The message from {pending?.name} will be removed. This cannot be undone.</>}
        confirmLabel="Delete"
        busy={busy}
        onConfirm={confirmDelete}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}
