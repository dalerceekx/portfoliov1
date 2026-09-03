import { useEffect } from 'react';
import type { PublicSettings } from '../../types';

/** Person + WebSite JSON-LD, built only from data the admin actually entered. */
export function StructuredData({ settings }: { settings: PublicSettings }) {
  useEffect(() => {
    const url = settings.seo.canonicalUrl || window.location.origin;
    const payload = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Person',
          name: settings.name,
          description: settings.headline,
          email: settings.email ? `mailto:${settings.email}` : undefined,
          url,
          ...(settings.location ? { address: { '@type': 'PostalAddress', addressLocality: settings.location } } : {}),
          ...(settings.socialLinks.length > 0
            ? { sameAs: settings.socialLinks.map((l) => l.url) }
            : {}),
        },
        { '@type': 'WebSite', name: settings.name, url },
      ],
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(payload);
    document.head.appendChild(script);
    return () => {
      script.remove();
    };
  }, [settings]);

  return null;
}
