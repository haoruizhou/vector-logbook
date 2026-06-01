import type { Aircraft, Flight, Journey, ResolveResult, Stats } from "../types";
import { DEMO, demoApi } from "../demo";

async function j<T>(p: Promise<Response>): Promise<T> {
  const r = await p;
  if (!r.ok) throw new Error(`Request failed: ${r.status}`);
  return r.json() as Promise<T>;
}

const JSON_HEADERS = { "content-type": "application/json" };

const liveApi = {
  listFlights: (params: Record<string, string> = {}) =>
    j<{ total: number; items: Flight[] }>(
      fetch(`/api/flights?${new URLSearchParams(params)}`),
    ),
  getFlight: (id: number) => j<Flight>(fetch(`/api/flights/${id}`)),
  createFlight: (b: Partial<Flight>) =>
    j<Flight>(
      fetch("/api/flights", { method: "POST", headers: JSON_HEADERS, body: JSON.stringify(b) }),
    ),
  updateFlight: (id: number, b: Partial<Flight>) =>
    j<Flight>(
      fetch(`/api/flights/${id}`, {
        method: "PATCH",
        headers: JSON_HEADERS,
        body: JSON.stringify(b),
      }),
    ),
  deleteFlight: (id: number) => fetch(`/api/flights/${id}`, { method: "DELETE" }),

  listAircraft: () => j<Aircraft[]>(fetch("/api/aircraft")),
  createAircraft: (b: Partial<Aircraft>) =>
    j<Aircraft>(
      fetch("/api/aircraft", { method: "POST", headers: JSON_HEADERS, body: JSON.stringify(b) }),
    ),
  deleteAircraft: (id: string) => fetch(`/api/aircraft/${id}`, { method: "DELETE" }),

  resolve: (idents: string[]) =>
    j<ResolveResult>(fetch(`/api/resolve?idents=${encodeURIComponent(idents.join(","))}`)),
  refreshDatasets: () => j<Record<string, number>>(fetch("/api/datasets/refresh", { method: "POST" })),

  stats: () => j<Stats>(fetch("/api/stats")),
  journey: () => j<Journey>(fetch("/api/journey")),

  importCsv: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return j<{ aircraft_count: number; flight_count: number; skipped_count: number }>(
      fetch("/api/import", { method: "POST", body: fd }),
    );
  },
};

// The public Pages build swaps in static demo data; everything else is identical.
export const api = (DEMO ? (demoApi as unknown as typeof liveApi) : liveApi);
