import type { Config } from 'tailwindcss';

/**
 * Single source of truth for the design system. Nothing in the UI hardcodes a
 * hex value — components reference these tokens only.
 *
 * The palette, type scale and radii are Apple's marketing-site system: a white
 * canvas alternating with #F5F5F7, near-black rather than pure black text, one
 * blue that means "action", hairline rules instead of borders, and type doing
 * the work that decoration would do elsewhere.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#FFFFFF', // page ground
        surface: '#F5F5F7', // alternating section band, cards, footer
        surface2: '#FBFBFD', // barely-there tint, used between two grey bands
        obsidian: '#000000', // full-bleed dark section
        graphite: '#1D1D1F', // primary text — never pure black
        slate: '#6E6E73', // secondary text
        mute: '#86868B', // captions, legal, metadata
        hairline: '#D2D2D7', // the only border colour on the site
        link: '#0066CC', // inline text links
        alert: '#B3261E', // form errors and destructive actions
        // Accent hooks: /admin can retint these two without touching CSS.
        accent: 'rgb(var(--accent-primary) / <alpha-value>)',
        'accent-alt': 'rgb(var(--accent-secondary) / <alpha-value>)',
      },
      fontFamily: {
        /* Real SF Pro on Apple hardware; Inter is the closest metric substitute
           everywhere else. One family for the whole site, as Apple does. */
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          '"SF Pro Text"',
          '"Inter Variable"',
          'Inter',
          '"Helvetica Neue"',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
      },
      fontSize: {
        /* Apple's marketing scale: tight leading, negative tracking, weight 600
           doing the emphasis rather than 700/800. */
        hero: ['clamp(2.75rem, 6.4vw, 5.5rem)', { lineHeight: '1.05', letterSpacing: '-0.015em' }],
        headline: ['clamp(2rem, 4.2vw, 3.5rem)', { lineHeight: '1.07', letterSpacing: '-0.008em' }],
        title: ['clamp(1.5rem, 2.4vw, 2.25rem)', { lineHeight: '1.1', letterSpacing: '-0.004em' }],
        subhead: ['clamp(1.1875rem, 1.8vw, 1.6rem)', { lineHeight: '1.21', letterSpacing: '0.004em' }],
        lede: ['1.0625rem', { lineHeight: '1.47', letterSpacing: '-0.022em' }],
        caption: ['0.75rem', { lineHeight: '1.33', letterSpacing: '-0.01em' }],
      },
      maxWidth: {
        prose: '42rem', // Apple keeps body copy near 680px
        copy: '61.25rem', // 980px — the width its headlines sit in
        shell: '87.5rem', // 1400px outer container
      },
      spacing: {
        section: 'clamp(4.5rem, 8vw, 7.5rem)',
      },
      borderRadius: {
        tile: '28px', // large product tiles
        card: '18px', // standard card
        input: '12px',
        chip: '6px',
        pill: '980px', // Apple's button radius, to the pixel
      },
      boxShadow: {
        /* Apple separates surfaces with tone and hairlines, not shadow. What
           little shadow exists is a soft neutral lift, never a glow. */
        lift: '0 4px 24px rgba(0, 0, 0, 0.06)',
        raise: '0 12px 40px rgba(0, 0, 0, 0.10)',
      },
      transitionTimingFunction: {
        entrance: 'cubic-bezier(0.28, 0.11, 0.32, 1)', // Apple's standard curve
      },
      transitionDuration: {
        400: '400ms',
        600: '600ms',
      },
      keyframes: {
        rise: {
          from: { opacity: '0', transform: 'translate3d(0, 22px, 0)' },
          to: { opacity: '1', transform: 'translate3d(0, 0, 0)' },
        },
        fade: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        spin: { to: { transform: 'rotate(360deg)' } },
      },
      animation: {
        rise: 'rise 800ms cubic-bezier(0.28, 0.11, 0.32, 1) both',
        fade: 'fade 500ms cubic-bezier(0.28, 0.11, 0.32, 1) both',
        spin: 'spin 700ms linear infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
