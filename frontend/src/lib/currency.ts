import type { Flight } from "../types";
import { num } from "./foreflight";

export type Region = "FAA" | "CANADA";
export type Status = "current" | "expiring" | "expired" | "unknown";

export interface CurrencyItem {
  title: string;
  regulation: string;
  status: Status;
  /** Human-readable summary of what was found. */
  detail: string;
  /** ISO date the privilege lapses, if computable. */
  expires?: string;
}

const DAY = 86_400_000;

function parseDate(s?: string | null): number | null {
  if (!s) return null;
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : t;
}

function addDays(ms: number, days: number): string {
  return new Date(ms + days * DAY).toISOString().slice(0, 10);
}

// All calendar math is done in UTC so it doesn't drift with the local timezone.
function addMonths(ms: number, months: number): string {
  const d = new Date(ms);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, d.getUTCDate()))
    .toISOString()
    .slice(0, 10);
}

/** Last day of the calendar month `months` after `ms`. FAA "calendar month"
 *  privileges (e.g. flight review = 24 calendar months) run through month-end. */
function endOfCalendarMonth(ms: number, months: number): string {
  const d = new Date(ms);
  // day 0 of (month + months + 1) === last day of (month + months)
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months + 1, 0))
    .toISOString()
    .slice(0, 10);
}

/** First day of the month `months` before `asOf` — start of a calendar-month window. */
function startOfMonthsAgo(asOf: number, months: number): number {
  const d = new Date(asOf);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - months, 1);
}

/** `expiresIso` is the last day the privilege is valid (inclusive), so it
 *  actually lapses at the end of that day. */
function statusFor(expiresIso: string, asOf: number): Status {
  const lapse = Date.parse(expiresIso) + DAY;
  if (lapse <= asOf) return "expired";
  if (lapse - asOf < 30 * DAY) return "expiring";
  return "current";
}

/** Flights sorted most-recent first, with a valid date, each carrying `count`
 *  of the relevant event. Walk back until `needed` events accumulate; the date
 *  of the flight that crosses the threshold is the limiting recency event. */
function recency(
  flights: Flight[],
  count: (f: Flight) => number,
  needed: number,
): { anchor: number; have: number } | null {
  const rows = flights
    .map((f) => ({ t: parseDate(f.date), n: count(f) }))
    .filter((r): r is { t: number; n: number } => r.t !== null && r.n > 0)
    .sort((a, b) => b.t - a.t);
  let acc = 0;
  for (const r of rows) {
    acc += r.n;
    if (acc >= needed) return { anchor: r.t, have: acc };
  }
  return rows.length ? { anchor: rows[rows.length - 1].t, have: acc } : null;
}

/** Most recent flight where `pred` is true (e.g. a flight review). */
function lastWhere(flights: Flight[], pred: (f: Flight) => boolean): number | null {
  let best: number | null = null;
  for (const f of flights) {
    if (!pred(f)) continue;
    const t = parseDate(f.date);
    if (t !== null && (best === null || t > best)) best = t;
  }
  return best;
}

const isTrue = (v?: string | null) => {
  const s = String(v ?? "").toUpperCase();
  return s === "TRUE" || s === "1" || s === "Y";
};

function approachCount(f: Flight): number {
  return [f.approach1, f.approach2, f.approach3, f.approach4, f.approach5, f.approach6].filter(
    (a) => a && String(a).trim(),
  ).length;
}

const takeoffs = (f: Flight) => num(f.day_takeoffs) + num(f.night_takeoffs);
const allLandings = (f: Flight) => num(f.all_landings);
const nightTakeoffs = (f: Flight) => num(f.night_takeoffs);
const nightLandings = (f: Flight) => num(f.night_landings_full_stop);

type Window = { days: number } | { months: number };

function rollingItem(
  title: string,
  regulation: string,
  flights: Flight[],
  count: (f: Flight) => number,
  needed: number,
  window: Window,
  asOf: number,
  unit: string,
): CurrencyItem {
  const r = recency(flights, count, needed);
  if (!r) {
    return { title, regulation, status: "unknown", detail: `No ${unit} logged.` };
  }
  const useDays = "days" in window;
  const expires = useDays ? addDays(r.anchor, window.days) : endOfCalendarMonth(r.anchor, window.months);
  const windowStart = useDays
    ? asOf - window.days * DAY
    : startOfMonthsAgo(asOf, window.months);
  const status = statusFor(expires, asOf);
  const within = flights
    .filter((f) => {
      const t = parseDate(f.date);
      return t !== null && t >= windowStart;
    })
    .reduce((s, f) => s + count(f), 0);
  const windowLabel = useDays ? `${window.days} days` : `${window.months} calendar months`;
  return {
    title,
    regulation,
    status,
    expires,
    detail: `${within} ${unit} in last ${windowLabel} (need ${needed}).`,
  };
}

export function computeCurrency(flights: Flight[], region: Region, asOf = Date.now()): CurrencyItem[] {
  if (region === "FAA") {
    const items: CurrencyItem[] = [
      rollingItem(
        "Day Passenger",
        "14 CFR 61.57(a)",
        flights,
        (f) => Math.min(takeoffs(f), allLandings(f)) || allLandings(f),
        3,
        { days: 90 },
        asOf,
        "takeoff/landing",
      ),
      rollingItem(
        "Night Passenger",
        "14 CFR 61.57(b)",
        flights,
        (f) => Math.min(nightTakeoffs(f), nightLandings(f)) || nightLandings(f),
        3,
        { days: 90 },
        asOf,
        "night T/O & full-stop ldg",
      ),
      rollingItem(
        "IFR Recency",
        "14 CFR 61.57(c)",
        flights,
        approachCount,
        6,
        { months: 6 },
        asOf,
        "instrument approaches",
      ),
    ];
    const fr = lastWhere(flights, (f) => isTrue(f.flight_review) || isTrue(f.checkride));
    items.push(
      fr
        ? {
            title: "Flight Review",
            regulation: "14 CFR 61.56",
            status: statusFor(endOfCalendarMonth(fr, 24), asOf),
            detail: `Last review/checkride ${new Date(fr).toISOString().slice(0, 10)}; valid 24 calendar months.`,
            expires: endOfCalendarMonth(fr, 24),
          }
        : {
            title: "Flight Review",
            regulation: "14 CFR 61.56",
            status: "unknown",
            detail: "No flight review or checkride flagged in logbook.",
          },
    );
    return items;
  }

  // Transport Canada — CARs 401.05
  const items: CurrencyItem[] = [
    rollingItem(
      "Passenger Carrying",
      "CAR 401.05(2)(a)",
      flights,
      (f) => Math.min(takeoffs(f), allLandings(f)) || allLandings(f),
      5,
      { months: 6 },
      asOf,
      "takeoff/landing",
    ),
    rollingItem(
      "Night Passenger",
      "CAR 401.05(2)(b)",
      flights,
      (f) => Math.min(nightTakeoffs(f), nightLandings(f)) || nightLandings(f),
      5,
      { months: 6 },
      asOf,
      "night T/O & ldg",
    ),
  ];
  // 5-year recency: acted as PIC/co-pilot or did a flight review.
  const lastFlight = lastWhere(flights, () => true);
  items.push(
    lastFlight
      ? {
          title: "5-Year Recency",
          regulation: "CAR 401.05(1)(a)",
          status: statusFor(addMonths(lastFlight, 60), asOf),
          detail: `Last logged flight ${new Date(lastFlight).toISOString().slice(0, 10)}.`,
          expires: addMonths(lastFlight, 60),
        }
      : { title: "5-Year Recency", regulation: "CAR 401.05(1)(a)", status: "unknown", detail: "No flights logged." },
  );
  items.push({
    title: "Recurrent Training",
    regulation: "CAR 401.05(1)(b)",
    status: "unknown",
    detail: "24-month recurrent training program — not tracked in logbook; verify separately.",
  });
  return items;
}
