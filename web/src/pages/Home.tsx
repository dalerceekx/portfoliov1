import { useCallback } from 'react';
import { Header } from '../components/navigation/Header';
import { Hero } from '../components/hero/Hero';
import { About } from '../components/about/About';
import { ProjectGrid } from '../components/projects/ProjectGrid';
import { Contact } from '../components/contact/Contact';
import { Footer } from '../components/layout/Footer';
import { BackToTop } from '../components/layout/BackToTop';
import { SkipLink } from '../components/layout/SkipLink';
import { AccentTheme } from '../components/layout/AccentTheme';
import { StructuredData } from '../components/layout/StructuredData';
import { Spinner } from '../components/ui/Spinner';
import { Button } from '../components/ui/Button';
import { useAsync } from '../hooks/useAsync';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { settingsService } from '../services/settingsService';
import { projectService } from '../services/projectService';
import type { PublicSettings } from '../types';

function SiteContent({ settings }: { settings: PublicSettings }) {
  const loadProjects = useCallback((signal: AbortSignal) => projectService.listPublic(signal), []);
  const projects = useAsync(loadProjects);
  const list = projects.data ?? [];

  useDocumentMeta({
    title: settings.seo.title,
    description: settings.seo.description,
    canonical: settings.seo.canonicalUrl,
    ogImage: settings.seo.ogImage,
    robots: 'index, follow',
  });

  return (
    <>
      <AccentTheme primary={settings.accentPrimary} secondary={settings.accentSecondary} />
      <StructuredData settings={settings} />
      <SkipLink />
      <Header name={settings.name} />

      <main id="main">
        <Hero settings={settings} projects={list} />
        <About settings={settings} />
        <ProjectGrid
          projects={list}
          loading={projects.loading}
          error={projects.error}
          onRetry={projects.reload}
        />
        <Contact settings={settings} />
      </main>

      <Footer settings={settings} />
      <BackToTop />
    </>
  );
}

export function Home() {
  const loadSettings = useCallback((signal: AbortSignal) => settingsService.getPublic(signal), []);
  const { data, loading, error, reload } = useAsync(loadSettings);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate">
        <Spinner label="Loading" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="card max-w-md rounded-card p-8 text-center">
          <h1 className="text-xl font-semibold text-graphite">This site is offline</h1>
          <p className="mt-2 text-sm text-slate">
            {error ?? 'The content service did not respond.'}
          </p>
          <Button variant="secondary" size="sm" className="mt-6" onClick={reload}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  return <SiteContent settings={data} />;
}
