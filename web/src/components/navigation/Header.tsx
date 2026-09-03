import { useEffect, useState } from 'react';
import { SECTIONS, SECTION_IDS } from '../../constants/nav';
import { useActiveSection } from '../../hooks/useActiveSection';
import { Close, Menu } from '../ui/Icons';

/**
 * Apple's navigation bar, to its own measurements: 44px tall, 12px type, a
 * translucent white ground with saturated backdrop blur, and a single hairline
 * underneath. It does not grow, shrink or change colour on scroll.
 */
export function Header({ name }: { name: string }) {
  const active = useActiveSection([...SECTION_IDS]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <header className="nav-blur fixed inset-x-0 top-0 z-50 animate-fade border-b border-hairline">
      <div className="shell flex h-11 items-center justify-between gap-6 sm:h-12">
        <a
          href="#home"
          className="rounded-chip text-[0.8125rem] font-semibold tracking-tight text-graphite"
        >
          {name}
        </a>

        <nav aria-label="Primary" className="hidden md:block">
          <ul className="flex items-center gap-8">
            {SECTIONS.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  aria-current={active === section.id ? 'true' : undefined}
                  className={`rounded-chip text-caption transition-opacity duration-200 hover:opacity-100 ${
                    active === section.id
                      ? 'font-medium text-graphite opacity-100'
                      : 'text-graphite opacity-80'
                  }`}
                >
                  {section.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? 'Close menu' : 'Open menu'}
          className="-mr-2 flex h-11 w-11 items-center justify-center rounded-chip text-graphite md:hidden"
        >
          {open ? <Close /> : <Menu />}
        </button>
      </div>

      <div
        id="mobile-nav"
        className={`nav-blur overflow-hidden border-t border-hairline transition-[max-height,opacity] duration-400 ease-entrance md:hidden ${
          open ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <nav aria-label="Mobile" className="shell py-2">
          <ul className="flex flex-col">
            {SECTIONS.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  onClick={() => setOpen(false)}
                  tabIndex={open ? 0 : -1}
                  className={`flex min-h-[52px] items-center border-b border-hairline text-subhead ${
                    active === section.id ? 'font-semibold text-graphite' : 'text-graphite'
                  }`}
                >
                  {section.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
