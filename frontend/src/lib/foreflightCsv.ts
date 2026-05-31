import type { Aircraft, Flight } from "../types";
import { AIRCRAFT_HEADER_TO_FIELD, FLIGHT_HEADER_TO_FIELD } from "./foreflightFields";

/** Minimal RFC-4180 CSV line parser (handles quoted fields and doubled quotes). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const s = text.replace(/\r\n?/g, "\n");
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const clean = (v: string | undefined) => {
  const t = (v ?? "").trim();
  return t === "" ? null : t;
};

export interface ParsedLogbook {
  aircraft: Aircraft[];
  flights: Flight[];
  skipped: number;
}

/** Parse a ForeFlight two-table CSV in the browser (mirror of the backend). */
export function parseForeflightCsv(text: string): ParsedLogbook {
  const rows = parseCsv(text);
  const out: ParsedLogbook = { aircraft: [], flights: [], skipped: 0 };
  let section: "aircraft_header" | "flights_header" | "aircraft" | "flights" | null = null;
  let headerMap: Record<number, string> = {};
  let nextId = 1;

  for (const row of rows) {
    const first = (row[0] ?? "").trim();
    if (first.startsWith("Aircraft Table")) {
      section = "aircraft_header";
      headerMap = {};
      continue;
    }
    if (first.startsWith("Flights Table")) {
      section = "flights_header";
      headerMap = {};
      continue;
    }
    if (section === "aircraft_header" || section === "flights_header") {
      const lookup = section === "aircraft_header" ? AIRCRAFT_HEADER_TO_FIELD : FLIGHT_HEADER_TO_FIELD;
      headerMap = {};
      row.forEach((h, i) => {
        const f = lookup[h.trim()];
        if (f) headerMap[i] = f;
      });
      section = section === "aircraft_header" ? "aircraft" : "flights";
      continue;
    }
    if (section === "aircraft" || section === "flights") {
      if (!row.some((c) => c.trim())) continue; // blank separator
      const rec: Record<string, string | null> = {};
      for (const [i, field] of Object.entries(headerMap)) rec[field] = clean(row[Number(i)]);
      if (section === "aircraft") {
        if (rec.aircraft_id) out.aircraft.push(rec as unknown as Aircraft);
        else out.skipped++;
      } else if (rec.date) {
        out.flights.push({ id: nextId++, ...rec } as unknown as Flight);
      } else out.skipped++;
    }
  }
  // Dedupe aircraft by tail (last wins), matching backend import behaviour.
  const byId = new Map<string, Aircraft>();
  for (const a of out.aircraft) byId.set(a.aircraft_id, a);
  out.aircraft = [...byId.values()];
  return out;
}
