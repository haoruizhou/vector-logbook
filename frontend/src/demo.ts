// Static demo dataset for the public Pages build (no backend, no storage).
// Built with VITE_DEMO=1. No real personal data: fictional tail numbers and
// crew redacted to roles. Visitors can also import their own ForeFlight CSV —
// it is parsed entirely in the browser and held only in memory (see demoStore).
import type { Aircraft, Flight, ResolveResult, Stats, Waypoint } from "./types";
import { num } from "./lib/foreflight";
import { resolveIdentsClient } from "./lib/coordClient";

export const DEMO = import.meta.env.VITE_DEMO === "1";

const A = (p: Partial<Aircraft>): Aircraft => ({ aircraft_id: "", ...p }) as Aircraft;
const F = (p: Partial<Flight>): Flight => ({ id: 0, ...p }) as Flight;

const sampleAircraft: Aircraft[] = [
  A({ aircraft_id: "N12345", type_code: "C172", make: "Cessna", model: "172", aircraft_class: "airplane_single_engine_land" }),
  A({ aircraft_id: "N12321", type_code: "P28A", make: "Piper", model: "PA-28-151", aircraft_class: "airplane_single_engine_land" }),
];

// Sample flights all depart KSBA (Santa Barbara) — where the journey started.
const sampleFlights: Flight[] = [
  F({
    id: 1, date: "2025-06-27", aircraft_id: "N12345", from_: "KSBA", to: "KMYF",
    route: "SLI OCN VPSMS", total_time: "1.6", pic: "1.6", cross_country: "1.6",
    distance: "165.0", day_takeoffs: "1", day_landings_full_stop: "1", all_landings: "1",
    person1: "Passenger", pilot_comments: "Coastal routing south via the VFR flyway.",
  }),
  F({
    id: 2, date: "2023-07-01", aircraft_id: "N12321", from_: "KSBA", to: "KSBP",
    total_time: "1.5", pic: "1.5", cross_country: "1.5", distance: "62.30",
    day_takeoffs: "1", day_landings_full_stop: "1", all_landings: "1",
    pilot_comments: "Direct great-circle leg up the coast.",
  }),
  F({
    id: 3, date: "2022-12-28", aircraft_id: "N12345", from_: "KSBA", to: "KSBP",
    total_time: "0.9", pic: "0.9", night: "0.9", cross_country: "0.9",
    night_takeoffs: "1", night_landings_full_stop: "1", all_landings: "1",
    pilot_comments: "Night cross-country.",
  }),
  F({
    id: 4, date: "2021-04-29", aircraft_id: "N12321", from_: "KSBA", to: "KSBA",
    total_time: "0.7", solo: "0.7", day_takeoffs: "5", day_landings_full_stop: "5",
    all_landings: "5", pilot_comments: "Solo pattern work, crosswind landings.",
  }),
  F({
    id: 5, date: "2021-05-06", aircraft_id: "N12345", from_: "KSBA", to: "KIZA",
    total_time: "1.5", dual_received: "1.5", day_takeoffs: "2", day_landings_full_stop: "2",
    all_landings: "2", flight_review: "TRUE", instructor_name: "Instructor (redacted)",
    pilot_comments: "Flight review — airwork, maneuvers, and non-towered operations at Santa Ynez.",
  }),
];

// Coordinate fixture for the built-in sample idents (avoids a network fetch for
// the default demo). Imported CSVs resolve against live data via coordClient.
const SAMPLE_WP: Record<string, Waypoint> = {
  KSBA: { ident: "KSBA", lat: 34.426201, lon: -119.840401, type: "airport", name: "Santa Barbara" },
  KMYF: { ident: "KMYF", lat: 32.8157, lon: -117.139999, type: "airport", name: "Montgomery-Gibbs" },
  KSBP: { ident: "KSBP", lat: 35.236801, lon: -120.642403, type: "airport", name: "San Luis Obispo" },
  KIZA: { ident: "KIZA", lat: 34.606800, lon: -120.075798, type: "airport", name: "Santa Ynez" },
  SLI: { ident: "SLI", lat: 33.78329, lon: -118.055, type: "vor", name: "Seal Beach" },
  OCN: { ident: "OCN", lat: 33.2408, lon: -117.4178, type: "vor", name: "Oceanside" },
  VPSMS: { ident: "VPSMS", lat: 32.84, lon: -117.251666, type: "fix", name: "VPSMS" },
};

// Mutable in-memory working set. There is NO persistence: a page refresh
// reloads this module and resets everything to the sample flights. This lets
// visitors add, edit, delete, and import freely to exercise the whole UI
// without a backend, with nothing ever saved.
interface State {
  flights: Flight[];
  aircraft: Aircraft[];
}
const seed = (): State => ({
  flights: sampleFlights.map((f) => ({ ...f })),
  aircraft: sampleAircraft.map((a) => ({ ...a })),
});
let state: State = seed();

export function setImported(data: { flights: Flight[]; aircraft: Aircraft[] } | null) {
  state = data ? { flights: data.flights, aircraft: data.aircraft } : seed();
}

function nextFlightId(): number {
  return state.flights.reduce((m, f) => Math.max(m, f.id), 0) + 1;
}

function computeStats(flights: Flight[]): Stats {
  const sum = (k: keyof Flight) => flights.reduce((s, f) => s + num(f[k]), 0);
  const r1 = (n: number) => Math.round(n * 10) / 10;
  const byYear: Record<string, number> = {};
  const byAircraft: Record<string, number> = {};
  let landings = 0;
  for (const f of flights) {
    const yr = (f.date ?? "").slice(0, 4);
    if (yr) byYear[yr] = r1((byYear[yr] ?? 0) + num(f.total_time));
    const ac = f.aircraft_id ?? "—";
    byAircraft[ac] = r1((byAircraft[ac] ?? 0) + num(f.total_time));
    landings += num(f.all_landings);
  }
  return {
    total_flights: flights.length,
    total_landings: landings,
    total_time: r1(sum("total_time")),
    total_pic: r1(sum("pic")),
    total_sic: r1(sum("sic")),
    total_night: r1(sum("night")),
    total_cross_country: r1(sum("cross_country")),
    total_actual_instrument: r1(sum("actual_instrument")),
    total_simulated_instrument: r1(sum("simulated_instrument")),
    by_year: Object.fromEntries(Object.entries(byYear).sort()),
    by_aircraft: Object.fromEntries(Object.entries(byAircraft).sort((a, b) => b[1] - a[1])),
  };
}

export const demoApi = {
  listFlights: async () => ({ total: state.flights.length, items: [...state.flights] }),
  getFlight: async (id: number) => state.flights.find((f) => f.id === id)!,
  createFlight: async (body: Partial<Flight>) => {
    const flight = { ...body, id: nextFlightId() } as Flight;
    state.flights.push(flight);
    return flight;
  },
  updateFlight: async (id: number, body: Partial<Flight>) => {
    const flight = state.flights.find((f) => f.id === id)!;
    Object.assign(flight, body);
    return flight;
  },
  deleteFlight: async (id: number) => {
    state.flights = state.flights.filter((f) => f.id !== id);
    return new Response(null, { status: 204 });
  },
  listAircraft: async () => [...state.aircraft],
  createAircraft: async (body: Partial<Aircraft>) => {
    const a = { ...body } as Aircraft;
    const i = state.aircraft.findIndex((x) => x.aircraft_id === a.aircraft_id);
    if (i >= 0) state.aircraft[i] = a;
    else state.aircraft.push(a);
    return a;
  },
  deleteAircraft: async (id: string) => {
    state.aircraft = state.aircraft.filter((a) => a.aircraft_id !== id);
    return new Response(null, { status: 204 });
  },
  // Fixture first (no network for the built-in samples), then live OurAirports +
  // FAA data fetched in-browser for any other identifiers (imported/added).
  resolve: async (idents: string[]): Promise<ResolveResult> => {
    const hits: ResolveResult = {};
    const missing: string[] = [];
    for (const raw of idents) {
      const id = raw.trim().toUpperCase();
      if (!id) continue;
      if (SAMPLE_WP[id]) hits[id] = SAMPLE_WP[id];
      else missing.push(id);
    }
    if (missing.length) Object.assign(hits, await resolveIdentsClient(missing));
    return hits;
  },
  refreshDatasets: async () => ({}),
  stats: async () => computeStats(state.flights),
  importCsv: async () => undefined as never,
};
