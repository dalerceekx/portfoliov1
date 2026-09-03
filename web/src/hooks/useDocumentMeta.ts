import { useEffect } from 'react';

type Meta = {
  title: string;
  description: string;
  canonical?: string;
  ogImage?: string | null;
  robots?: string;
};

function upsert(selector: string, create: () => HTMLElement, apply: (el: HTMLElement) => void) {
  let el = document.head.querySelector<HTMLElement>(selector);
  if (!el) {
    el = create();
    document.head.appendChild(el);
  }
  apply(el);
}

/** Keeps title, description, canonical and Open Graph tags in sync with the data. */
export function useDocumentMeta({ title, description, canonical, ogImage, robots }: Meta) {
  useEffect(() => {
    document.title = title;

    const metaTag = (name: string, content: string, attr: 'name' | 'property' = 'name') =>
      upsert(
        `meta[${attr}="${name}"]`,
        () => {
          const el = document.createElement('meta');
          el.setAttribute(attr, name);
          return el;
        },
        (el) => el.setAttribute('content', content),
      );

    metaTag('description', description);
    if (robots) metaTag('robots', robots);
    metaTag('og:title', title, 'property');
    metaTag('og:description', description, 'property');
    metaTag('og:type', 'website', 'property');
    metaTag('twitter:card', ogImage ? 'summary_large_image' : 'summary');
    metaTag('twitter:title', title);
    metaTag('twitter:description', description);

    if (canonical) {
      metaTag('og:url', canonical, 'property');
      upsert(
        'link[rel="canonical"]',
        () => {
          const el = document.createElement('link');
          el.setAttribute('rel', 'canonical');
          return el;
        },
        (el) => el.setAttribute('href', canonical),
      );
    }
    if (ogImage) {
      const absolute = ogImage.startsWith('http') ? ogImage : `${window.location.origin}${ogImage}`;
      metaTag('og:image', absolute, 'property');
      metaTag('twitter:image', absolute);
    }
  }, [title, description, canonical, ogImage, robots]);
}
