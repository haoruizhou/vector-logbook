// A field label that, when a hint is supplied, gets a dotted underline and
// reveals an explanatory popover on hover, keyboard focus, and tap (focus
// fires on tap for the tabbable span, so touch is covered without JS).
export default function FieldHint({ label, hint }: { label: string; hint?: string }) {
  if (!hint) return <>{label}</>;
  return (
    <span className="field-hint" tabIndex={0} role="note" aria-label={`${label}: ${hint}`}>
      {label}
      <span className="field-hint-pop" role="tooltip">
        {hint}
      </span>
    </span>
  );
}
