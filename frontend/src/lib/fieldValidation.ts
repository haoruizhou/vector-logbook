// Per-field validation for the flight form. Empty is always allowed (every
// field is optional); a non-empty value must match its type. Used both live
// while typing (soft red hint) and as a hard gate on save.
export type ValidatedType = "time" | "num" | "text" | "date" | "bool" | undefined;

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export function validateField(type: ValidatedType, value: string): string | null {
  const v = value.trim();
  if (v === "") return null;
  if (type === "time") return HHMM.test(v) ? null : "Use 24-hour hh:mm (e.g. 13:45)";
  if (type === "num") {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? null : "Must be a number";
  }
  return null;
}
