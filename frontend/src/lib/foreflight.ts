import type { Flight } from "../types";

export interface Person {
  name: string;
  role: string;
  email: string;
  phone: string;
}

/** ForeFlight encodes a person as "Name;Role;email;phone". */
export function parsePerson(raw?: string | null): Person | null {
  if (!raw || !raw.trim()) return null;
  const [name = "", role = "", email = "", phone = ""] = raw.split(";");
  return { name: name.trim(), role: role.trim(), email: email.trim(), phone: phone.trim() };
}

/** Ordered list of identifiers for a flight: From, route fixes, To. */
export function routeIdents(flight: Pick<Flight, "from_" | "to" | "route">): string[] {
  const mid = (flight.route ?? "").trim().split(/\s+/).filter(Boolean);
  return [flight.from_, ...mid, flight.to].filter((x): x is string => !!x);
}

/** ForeFlight wraps free-text remarks in literal quote characters; strip them. */
export function cleanText(raw?: string | null): string {
  if (!raw) return "";
  return raw.replace(/^"+|"+$/g, "").trim();
}

export function num(v?: string | number | null): number {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : 0;
}
