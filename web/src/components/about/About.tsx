import { SectionHeading } from '../ui/SectionHeading';
import type { PublicSettings } from '../../types';

/**
 * The grey band. Apple alternates #FFFFFF and #F5F5F7 full-bleed rather than
 * drawing boxes, so the section change is felt before it is read.
 */
export function About({ settings }: { settings: PublicSettings }) {
  const paragraphs = settings.bio.split(/\n{2,}/).filter(Boolean);

  return (
    <section
      id="about"
      aria-labelledby="about-title"
      className="scroll-mt-12 bg-surface py-section"
    >
      <div className="shell">
        <SectionHeading id="about" eyebrow="About" title={settings.aboutTitle || 'About'} />

        {settings.avatar ? (
          <img
            src={settings.avatar}
            alt={`Portrait of ${settings.name}`}
            loading="lazy"
            decoding="async"
            width={160}
            height={160}
            className="mx-auto mt-12 h-40 w-40 rounded-pill object-cover"
          />
        ) : null}

        {/* Long copy is left-aligned inside a centred column — Apple only centres
            body text when it is a line or two. */}
        <div className="mx-auto mt-12 max-w-prose space-y-6 text-lede text-slate">
          {paragraphs.length > 0 ? (
            paragraphs.map((paragraph, i) => <p key={i}>{paragraph}</p>)
          ) : (
            <p>Bio coming soon.</p>
          )}
        </div>

        {settings.skills.length > 0 ? (
          <div className="mx-auto mt-20 max-w-copy">
            <h3 className="text-center text-caption uppercase tracking-[0.06em] text-mute">
              Stack
            </h3>

            <ul className="mt-6 grid grid-cols-2 gap-x-8 border-t border-hairline sm:grid-cols-3 lg:grid-cols-4">
              {settings.skills.map((skill) => (
                <li
                  key={skill}
                  className="border-b border-hairline py-3 text-lede text-graphite"
                >
                  {skill}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}
