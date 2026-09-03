import type { PublicProject, PublicSettings } from '../../types';

/**
 * Apple's hero is type and space: an eyebrow, one very large line, one calm
 * sentence under it, and two blue links. No panel, no illustration, no card —
 * the restraint is the design.
 */
export function Hero({
  settings,
  projects,
}: {
  settings: PublicSettings;
  projects: PublicProject[];
}) {
  const live = projects.filter((p) => p.status === 'LIVE').length;

  // The thin fact strip Apple runs under a hero, in place of body copy.
  const facts = [
    settings.location ? { label: 'Based in', value: settings.location } : null,
    live > 0 ? { label: 'Shipped', value: `${live} live ${live === 1 ? 'project' : 'projects'}` } : null,
    settings.availability ? { label: 'Status', value: settings.availability } : null,
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <section id="home" aria-labelledby="hero-title" className="scroll-mt-12 pb-section pt-28 sm:pt-36">
      <div className="shell">
        <div className="copy text-center">
          {settings.subheadline ? (
            <p className="animate-rise delay-step-1 text-subhead font-semibold text-graphite">
              {settings.subheadline}
            </p>
          ) : null}

          <h1
            id="hero-title"
            className="animate-rise delay-step-2 mt-3 text-hero font-semibold text-graphite"
          >
            {settings.name}
          </h1>

          <p className="animate-rise delay-step-3 mx-auto mt-6 max-w-prose text-subhead font-normal text-slate">
            {settings.headline}
          </p>

          <div className="animate-rise delay-step-4 mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            <a href="#projects" className="link-chevron">
              View work
            </a>
            <a href="#contact" className="link-chevron">
              Get in touch
            </a>
          </div>
        </div>

        {facts.length > 0 ? (
          <dl className="animate-rise delay-step-5 mx-auto mt-20 grid max-w-copy grid-cols-1 divide-y divide-hairline border-y border-hairline sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {facts.map((fact) => (
              <div key={fact.label} className="px-2 py-6 text-center">
                <dt className="text-caption uppercase tracking-[0.06em] text-mute">{fact.label}</dt>
                <dd className="mt-1.5 text-lede font-medium text-graphite">{fact.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
    </section>
  );
}
