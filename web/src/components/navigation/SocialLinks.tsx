import type { SocialLink } from '../../types';

/**
 * Apple never boxes a social link. These are plain text links, separated by
 * hairline dividers, at the size it uses for secondary navigation.
 */
export function SocialLinks({
  links,
  className = '',
}: {
  links: SocialLink[];
  className?: string;
}) {
  if (links.length === 0) return null;

  return (
    <ul className={`flex flex-wrap items-center gap-x-4 gap-y-2 ${className}`}>
      {links.map((link, index) => (
        <li key={link.id} className="flex items-center gap-4">
          {index > 0 ? <span aria-hidden className="h-3 w-px bg-hairline" /> : null}
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-chip text-sm text-slate transition-colors duration-200 hover:text-graphite hover:underline"
          >
            {link.label}
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
