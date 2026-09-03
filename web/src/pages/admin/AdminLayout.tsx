import { useState } from 'react';
import { NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { Close, Menu } from '../../components/ui/Icons';
import { useAuth } from '../../hooks/useAuth';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';

const LINKS = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/projects', label: 'Projects', end: false },
  { to: '/admin/settings', label: 'Site settings', end: false },
  { to: '/admin/messages', label: 'Messages', end: false },
  { to: '/admin/security', label: 'Security', end: false },
];

export function AdminLayout() {
  const { admin, loading, logout } = useAuth();
  const navigate = useNavigate();
  const [navOpen, setNavOpen] = useState(false);

  useDocumentMeta({
    title: 'Admin',
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
  // Server-side middleware is the real gate; this only avoids rendering a dead shell.
  if (!admin) return <Navigate to="/admin/login" replace />;

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `block rounded-card px-3.5 py-2.5 text-sm transition-colors duration-200 ${
      isActive ? 'bg-accent/10 text-accent' : 'text-slate hover:bg-black/[0.04] hover:text-graphite'
    }`;

  return (
    <div className="min-h-screen bg-surface">
      <header className="nav-blur sticky top-0 z-40 border-b border-hairline">
        <div className="mx-auto flex h-16 max-w-[86rem] items-center justify-between gap-4 px-5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setNavOpen((v) => !v)}
              aria-expanded={navOpen}
              aria-controls="admin-nav"
              aria-label={navOpen ? 'Close menu' : 'Open menu'}
              className="card flex h-10 w-10 items-center justify-center rounded-card text-graphite lg:hidden"
            >
              {navOpen ? <Close /> : <Menu />}
            </button>
            <p className="text-sm font-semibold text-graphite">Content manager</p>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/"
              className="hidden rounded-pill px-3 py-2 text-sm text-slate transition-colors hover:text-graphite sm:block"
            >
              View site
            </a>
            <span className="hidden text-sm text-slate md:block">{admin.email}</span>
            <Button
              variant="secondary"
              size="sm"
              onClick={async () => {
                await logout();
                navigate('/admin/login', { replace: true });
              }}
            >
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[86rem] gap-6 px-5 py-6">
        <nav
          id="admin-nav"
          aria-label="Admin sections"
          className={`${navOpen ? 'block' : 'hidden'} fixed inset-x-5 top-20 z-30 rounded-card border border-hairline bg-canvas p-2 shadow-raise lg:static lg:block lg:w-56 lg:shrink-0 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none`}
        >
          <ul className="space-y-1 lg:sticky lg:top-24">
            {LINKS.map((link) => (
              <li key={link.to}>
                <NavLink to={link.to} end={link.end} className={linkClass} onClick={() => setNavOpen(false)}>
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <main className="min-w-0 flex-1 pb-16">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
