import { useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';

/* Apple's field: white ground, one hairline, 12px radius, and a blue ring on
   focus rather than a colour change. */
const control =
  'w-full rounded-input border border-hairline bg-canvas px-4 py-3 text-lede text-graphite placeholder:text-mute transition-colors duration-200 focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-40 aria-[invalid=true]:border-alert';

function Wrapper({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-graphite">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm text-mute">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

interface TextProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
}

export function TextField({ label, hint, error, ...rest }: TextProps) {
  const generated = useId();
  const id = rest.id ?? generated;
  return (
    <Wrapper id={id} label={label} hint={hint} error={error}>
      <input
        {...rest}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={control}
      />
    </Wrapper>
  );
}

interface AreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hint?: string;
  error?: string;
}

export function TextAreaField({ label, hint, error, ...rest }: AreaProps) {
  const generated = useId();
  const id = rest.id ?? generated;
  return (
    <Wrapper id={id} label={label} hint={hint} error={error}>
      <textarea
        {...rest}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={`${control} min-h-[120px] resize-y leading-relaxed`}
      />
    </Wrapper>
  );
}

interface SelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  hint?: string;
  error?: string;
  id?: string;
}

export function SelectField({ label, value, onChange, options, hint, error, id }: SelectProps) {
  const generated = useId();
  const fieldId = id ?? generated;
  return (
    <Wrapper id={fieldId} label={label} hint={hint} error={error}>
      <select
        id={fieldId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        className={control}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-canvas">
            {option.label}
          </option>
        ))}
      </select>
    </Wrapper>
  );
}

export function CheckboxField({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="flex items-start gap-3 rounded-input border border-hairline bg-canvas p-3.5">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-5 w-5 shrink-0 accent-[rgb(var(--accent-primary))]"
      />
      <div>
        <label htmlFor={id} className="text-sm font-medium text-graphite">
          {label}
        </label>
        {description ? <p className="text-sm text-mute">{description}</p> : null}
      </div>
    </div>
  );
}
