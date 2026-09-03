import { useMemo, useState } from 'react';
import { ProjectCard } from './ProjectCard';
import { SectionHeading } from '../ui/SectionHeading';
import { Spinner } from '../ui/Spinner';
import { Button } from '../ui/Button';
import type { PublicProject } from '../../types';

function EmptyState() {
  return (
    <div className="rounded-card bg-surface px-6 py-20 text-center">
      <p className="text-subhead font-semibold text-graphite">Projects coming soon.</p>
      <p className="mx-auto mt-2 max-w-prose text-lede text-slate">
        Nothing is published here yet. Check back shortly, or get in touch directly.
      </p>
    </div>
  );
}

export function ProjectGrid({
  projects,
  loading,
  error,
  onRetry,
}: {
  projects: PublicProject[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  const [filter, setFilter] = useState('All');

  const categories = useMemo(
    () => ['All', ...Array.from(new Set(projects.map((p) => p.category))).sort()],
    [projects],
  );

  // The full set is already loaded, so filtering stays on the client.
  const visible = filter === 'All' ? projects : projects.filter((p) => p.category === filter);

  // One project leads the section at size; the rest sit under it as a denser
  // grid. Filtering down to a single card should not promote it to a feature.
  const lead = visible.length > 2 ? visible.find((p) => p.featured) : undefined;
  const rest = lead ? visible.filter((p) => p.id !== lead.id) : visible;

  return (
    <section id="projects" aria-labelledby="projects-title" className="scroll-mt-12 py-section">
      <div className="shell">
        <SectionHeading
          id="projects"
          eyebrow="Work"
          title="Built, shipped, and running."
          lede="Each one with the stack it actually runs on."
        />

        {categories.length > 2 && !loading && !error ? (
          /* Apple's segmented control: one pill track, the active segment filled.
             A track that does not fit scrolls sideways — it never wraps, because
             a wrapped pill breaks the single-track shape the control depends on.
             The negative margin lets it bleed to the screen edge while scrolling. */
          <div className="no-scrollbar -mx-6 mt-10 overflow-x-auto px-6 sm:mx-0 sm:px-0">
            <div
              role="group"
              aria-label="Filter projects by category"
              className="mx-auto flex w-max gap-1 rounded-pill bg-black/[0.05] p-1"
            >
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setFilter(category)}
                  aria-pressed={filter === category}
                  className={`min-h-[36px] shrink-0 whitespace-nowrap rounded-pill px-4 text-sm transition-colors duration-200 ${
                    filter === category
                      ? 'bg-canvas font-medium text-graphite shadow-lift'
                      : 'text-slate hover:text-graphite'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-12">
          {loading ? (
            <div className="flex justify-center py-16 text-slate">
              <Spinner label="Loading projects" />
            </div>
          ) : error ? (
            <div className="rounded-card bg-surface px-6 py-16 text-center">
              <p className="text-lede text-graphite">{error}</p>
              <Button variant="secondary" size="sm" className="mt-5" onClick={onRetry}>
                Try again
              </Button>
            </div>
          ) : visible.length === 0 ? (
            <EmptyState />
          ) : (
            /* Apple's tile gap is deliberately tight — the blocks read as one
               composition rather than as separate cards on a page. */
            <div className="space-y-3">
              {lead ? (
                <div className="animate-fade">
                  <ProjectCard project={lead} variant="feature" />
                </div>
              ) : null}

              {rest.length > 0 ? (
                <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {rest.map((project) => (
                    <li key={project.id} className="animate-fade">
                      <ProjectCard project={project} />
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
