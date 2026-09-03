/**
 * Apple opens a section with an optional one-word eyebrow, one large headline,
 * and at most one line of subhead — centred, in a column narrower than the page.
 * There is no numbering, no rule, and no decoration.
 */
export function SectionHeading({
  id,
  eyebrow,
  title,
  lede,
  align = 'center',
}: {
  id: string;
  eyebrow?: string;
  title: string;
  lede?: string;
  align?: 'center' | 'left';
}) {
  const centred = align === 'center';

  return (
    <header className={centred ? 'copy text-center' : 'max-w-prose'}>
      {eyebrow ? (
        <p className="text-lede font-semibold text-graphite">{eyebrow}</p>
      ) : null}

      <h2
        id={`${id}-title`}
        className={`text-headline font-semibold text-graphite ${eyebrow ? 'mt-2' : ''}`}
      >
        {title}
      </h2>

      {lede ? (
        <p className={`text-subhead font-normal text-slate ${centred ? 'mx-auto mt-4 max-w-prose' : 'mt-4'}`}>
          {lede}
        </p>
      ) : null}
    </header>
  );
}
