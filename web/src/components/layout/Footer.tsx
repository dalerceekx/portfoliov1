import { Link } from 'react-router-dom';
import { SECTIONS } from '../../constants/nav';
import { SocialLinks } from '../navigation/SocialLinks';
import type { PublicSettings } from '../../types';

/**
 * Apple's footer: the grey band, 12px type, hairline above and between the
 * rows, and nothing that competes with the page it closes.
 */
export function Footer({ settings }: { settings: PublicSettings }) {
  return (
    <footer className="bg-surface">
      <div className="shell py-10">
        {settings.footerText ? (
          <p className="text-caption text-mute">{settings.footerText}</p>
        ) : null}

        <div className="mt-5 flex flex-col gap-5 border-t border-hairline pt-5 sm:flex-row sm:items-center sm:justify-between">
          <nav aria-label="Footer">
            <ul className="flex flex-wrap gap-x-6 gap-y-2">
              {SECTIONS.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="rounded-chip text-caption text-slate transition-colors hover:text-graphite hover:underline"
                  >
                    {section.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <SocialLinks links={settings.socialLinks} />
        </div>

        {/* The sign-in link sits where Apple puts its region selector: last row,
            far side, at caption size. It is a way in, not a call to action. */}
        <div className="mt-5 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <p className="text-caption text-mute">
            Copyright © {new Date().getFullYear()} {settings.name}. All rights reserved.
          </p>

          <Link
            to="/admin/login"
            className="rounded-chip text-caption text-mute transition-colors hover:text-graphite hover:underline"
          >
            Sign in
          </Link>
        </div>
      </div>
    </footer>
  );
}
