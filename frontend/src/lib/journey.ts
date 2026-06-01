import type { Flight, Journey, JourneyAirport, JourneyLeg, JourneyMilestone, ResolveResult, Waypoint } from "../types";
import { gcDistanceNm } from "./geo";
import { num, routeIdents } from "./foreflight";

type ResolveFn = (idents: string[]) => ResolveResult;
const TIERS = [10, 25, 50, 100];

const personName = (raw?: string | null) => (raw ? String(raw).split(";")[0].trim() : "");

export function buildJourney(flights: Flight[], resolve: ResolveFn): Journey {
  const airports = new Map<string, JourneyAirport>();
  const legs = new Map<string, JourneyLeg>();
  const aircraftCounts = new Map<string, number>();
  const people = new Set<string>();
  const countries = new Set<string>();
  let totalHours = 0;
  let nightHours = 0;
  let firstDate: string | null = null;
  let longestLeg = 0;

  for (const f of flights) {
    totalHours += num(f.total_time);
    nightHours += num(f.night);
    const ac = (f.aircraft_id ?? "").trim();
    if (ac) aircraftCounts.set(ac, (aircraftCounts.get(ac) ?? 0) + 1);
    for (let n = 1; n <= 6; n++) {
      const nm = personName(f[`person${n}`] as string | null | undefined);
      if (nm) people.add(nm);
    }
    const d = f.date ?? null;
    if (d && (firstDate === null || d < firstDate)) firstDate = d;
  }

  const ordered = [...flights].sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
  const seenAirports = new Set<string>();
  const seenCountries = new Set<string>();
  const tierDates = new Map<number, string | null>();
  let firstIntlDate: string | null = null;

  for (const f of ordered) {
    const idents = routeIdents(f);
    const resolved = resolve(idents);
    const pts = idents.map((i) => resolved[i]).filter((p): p is Waypoint => !!p);
    if (pts.length < 2) continue;
    const d = f.date ?? null;
    const src = f.from_ ? resolved[f.from_] : null;
    const dst = f.to ? resolved[f.to] : null;

    // Airports = resolved airport-type endpoints, counted at most once per
    // flight (a round-trip like KSBA→KSBA is a single visit, per the spec).
    const endpoints = new Map<string, Waypoint>();
    for (const p of [src, dst]) if (p && p.type === "airport") endpoints.set(p.ident, p);
    for (const p of endpoints.values()) {
      let rec = airports.get(p.ident);
      if (!rec) {
        rec = { ident: p.ident, name: p.name ?? null, country: p.country ?? null, lat: p.lat, lon: p.lon, visits: 0, first_date: null, last_date: null };
        airports.set(p.ident, rec);
      }
      rec.visits += 1;
      if (d) {
        if (rec.first_date === null || d < rec.first_date) rec.first_date = d;
        if (rec.last_date === null || d > rec.last_date) rec.last_date = d;
      }
      if (p.country) countries.add(p.country);
    }

    if (src && dst) {
      const key = `${src.ident} ${dst.ident}`;
      let leg = legs.get(key);
      if (!leg) {
        leg = { from_ident: src.ident, to_ident: dst.ident, from_lat: src.lat, from_lon: src.lon, to_lat: dst.lat, to_lon: dst.lon, count: 0, last_date: null };
        legs.set(key, leg);
      }
      leg.count += 1;
      if (d && (leg.last_date === null || d > leg.last_date)) leg.last_date = d;
      longestLeg = Math.max(longestLeg, gcDistanceNm(src.lat, src.lon, dst.lat, dst.lon));
    }

    for (const p of [src, dst]) if (p?.country) seenCountries.add(p.country);
    if (firstIntlDate === null && seenCountries.size >= 2) firstIntlDate = d;
    for (const p of [src, dst]) if (p?.type === "airport") seenAirports.add(p.ident);
    for (const tier of TIERS) if (!tierDates.has(tier) && seenAirports.size >= tier) tierDates.set(tier, d);
  }

  const airportList = [...airports.values()];
  const homeBase = airportList.reduce<JourneyAirport | null>((best, a) => (!best || a.visits > best.visits ? a : best), null);
  let furthest = 0;
  if (homeBase) {
    for (const a of airportList) {
      if (a.ident === homeBase.ident) continue;
      furthest = Math.max(furthest, gcDistanceNm(homeBase.lat, homeBase.lon, a.lat, a.lon));
    }
  }
  let callsign: string | null = null;
  let bestCount = -1;
  for (const [ac, c] of aircraftCounts) if (c > bestCount) { bestCount = c; callsign = ac; }

  const legList = [...legs.values()];
  const longestLegObj = legList.reduce<JourneyLeg | null>(
    (best, lg) => {
      const dist = gcDistanceNm(lg.from_lat, lg.from_lon, lg.to_lat, lg.to_lon);
      const bestDist = best ? gcDistanceNm(best.from_lat, best.from_lon, best.to_lat, best.to_lon) : -1;
      return dist > bestDist ? lg : best;
    },
    null,
  );

  const milestones: JourneyMilestone[] = [];
  if (flights.length) milestones.push({ key: "first_flight", label: "First flight", date: firstDate });
  if (countries.size >= 2) milestones.push({ key: "first_international", label: "First international", date: firstIntlDate });
  for (const tier of TIERS) if (airports.size >= tier) milestones.push({ key: `airports_${tier}`, label: `${tier} airports`, date: tierDates.get(tier) ?? null });
  if (longestLegObj) milestones.push({ key: "longest_journey", label: "Longest journey", date: longestLegObj.last_date });

  const r1 = (n: number) => Math.round(n * 10) / 10;
  return {
    airports: airportList,
    legs: legList,
    identity: {
      callsign,
      first_flight_year: firstDate ? firstDate.slice(0, 4) : null,
      home_base: homeBase ? homeBase.ident : null,
      total_hours: r1(totalHours),
      airport_count: airports.size,
      country_count: countries.size,
      aircraft_count: aircraftCounts.size,
      people_count: people.size,
      night_hours: r1(nightHours),
      longest_leg_nm: Math.round(longestLeg),
      furthest_from_home_nm: Math.round(furthest),
    },
    milestones,
  };
}
