import { Link } from 'react-router-dom';
import { useDocumentMeta } from '../hooks/useDocumentMeta';

export function NotFound() {
  useDocumentMeta({
    title: 'Page not found',
    description: 'This page does not exist.',
    robots: 'noindex, follow',
  });

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="text-center">
        <p className="text-caption uppercase tracking-[0.06em] text-mute">Error 404</p>
        <h1 className="mt-3 text-headline font-semibold text-graphite">
          This page doesn&rsquo;t exist.
        </h1>
        <p className="mx-auto mt-4 max-w-prose text-subhead text-slate">
          The link may be out of date, or the page may have moved.
        </p>
        <p className="mt-8">
          <Link to="/" className="link-chevron">
            Back to home
          </Link>
        </p>
      </div>
    </main>
  );
}
