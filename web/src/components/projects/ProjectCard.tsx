import { hostname, STATUS_LABEL } from '../../utils/format';
import type { PublicProject } from '../../types';

/**
 * Apple's product tile: a tinted block with no border and no shadow, text
 * centred at the top, and a blue link at the bottom. The lead project gets the
 * black treatment Apple reserves for its flagship; the rest sit on #F5F5F7.
 */

function Tile({
  project,
  tone,
  className = '',
}: {
  project: PublicProject;
  tone: 'dark' | 'light';
  className?: string;
}) {
  const dark = tone === 'dark';
  const title = dark ? 'text-surface' : 'text-graphite';
  const body = dark ? 'text-hairline' : 'text-slate';
  const meta = dark ? 'text-mute' : 'text-mute';

  return (
    <article
      className={`flex h-full flex-col items-center px-6 pb-10 pt-12 text-center sm:px-10 ${
        dark ? 'bg-obsidian rounded-tile' : 'bg-surface rounded-card'
      } ${className}`}
    >
      <p className={`text-caption uppercase tracking-[0.06em] ${meta}`}>{project.category}</p>

      <h3
        className={`mt-2 font-semibold ${title} ${dark ? 'text-title' : 'text-subhead'}`}
      >
        {project.title}
      </h3>

      <p className={`mx-auto mt-3 max-w-prose text-lede ${body}`}>{project.description}</p>

      {project.tags.length > 0 ? (
        <p className={`mt-4 text-caption ${meta}`}>{project.tags.slice(0, 5).join(' · ')}</p>
      ) : null}

      <div className="mt-auto flex flex-wrap items-center justify-center gap-x-7 gap-y-2 pt-7">
        {project.url ? (
          <a href={project.url} target="_blank" rel="noopener noreferrer" className="link-chevron">
            Open
            <span className="sr-only"> {hostname(project.url)} in a new tab</span>
          </a>
        ) : (
          /* Work with no public link still gets an action — Apple never leaves a
             tile as a dead end. */
          <a href="#contact" className="link-chevron">
            Ask about this
          </a>
        )}

        {project.status !== 'LIVE' ? (
          <span className={`text-lede ${meta}`}>{STATUS_LABEL[project.status]}</span>
        ) : null}
      </div>
    </article>
  );
}

export function ProjectCard({
  project,
  variant = 'compact',
}: {
  project: PublicProject;
  variant?: 'feature' | 'compact';
}) {
  return (
    <Tile
      project={project}
      tone={variant === 'feature' ? 'dark' : 'light'}
      className={variant === 'feature' ? 'sm:pb-14 sm:pt-16' : ''}
    />
  );
}
