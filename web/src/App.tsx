import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Home } from './pages/Home';
import { NotFound } from './pages/NotFound';
import { AuthProvider } from './hooks/useAuth';
import { ToastProvider } from './hooks/useToast';
import { Spinner } from './components/ui/Spinner';

// The admin bundle is code-split: a visitor to the public page never downloads it.
const Login = lazy(() => import('./pages/Login').then((m) => ({ default: m.Login })));
const AdminLayout = lazy(() =>
  import('./pages/admin/AdminLayout').then((m) => ({ default: m.AdminLayout })),
);
const Dashboard = lazy(() =>
  import('./pages/admin/Dashboard').then((m) => ({ default: m.Dashboard })),
);
const ProjectsList = lazy(() =>
  import('./pages/admin/ProjectsList').then((m) => ({ default: m.ProjectsList })),
);
const ProjectForm = lazy(() =>
  import('./pages/admin/ProjectForm').then((m) => ({ default: m.ProjectForm })),
);
const SettingsPage = lazy(() =>
  import('./pages/admin/SettingsPage').then((m) => ({ default: m.SettingsPage })),
);
const MessagesPage = lazy(() =>
  import('./pages/admin/MessagesPage').then((m) => ({ default: m.MessagesPage })),
);
const SecurityPage = lazy(() =>
  import('./pages/admin/SecurityPage').then((m) => ({ default: m.SecurityPage })),
);

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center text-slate">
      <Spinner label="Loading" />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/admin/login" element={<Login />} />
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="projects" element={<ProjectsList />} />
                <Route path="projects/new" element={<ProjectForm />} />
                <Route path="projects/:id" element={<ProjectForm />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="messages" element={<MessagesPage />} />
                <Route path="security" element={<SecurityPage />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
