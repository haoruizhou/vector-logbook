export interface StripField { label: string; value: string }

export default function Strip({
  code, fields, active, onHover, onLeave, onClick,
}: {
  code: string;
  fields: StripField[];
  active?: boolean;
  onHover?: () => void;
  onLeave?: () => void;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      className={`atc-strip${active ? " active" : ""}`}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onFocus={onHover}
      onBlur={onLeave}
      onClick={onClick}
    >
      <span className="atc-strip-code">{code}</span>
      <span className="atc-strip-fields">
        {fields.map((f) => (
          <span key={f.label} className="atc-strip-field">
            <span className="atc-strip-flabel">{f.label}</span>
            <span className="atc-strip-fvalue">{f.value}</span>
          </span>
        ))}
      </span>
    </button>
  );
}
