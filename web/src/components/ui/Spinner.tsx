export function Spinner({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        aria-hidden
        className="h-4 w-4 animate-spin rounded-pill border-2 border-current border-t-transparent opacity-70"
      />
      {label ? <span>{label}</span> : <span className="sr-only">Loading</span>}
    </span>
  );
}
