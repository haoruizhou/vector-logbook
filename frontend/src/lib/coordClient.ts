// Client-side coordinate resolution for the no-backend preview demo. Lazily
// fetches OurAirports (airports + navaids) and an optional FAA fixes CSV, builds
// an in-memory index, and resolves identifiers with the same proximity logic as
// the backend (collisions like "SLI" disambiguated by nearest anchor airport).
import type { ResolveResult, Waypoint } from "../types";
import { gcDistanceNm } from "./geo";
import { parseCsv } from "./foreflightCsv";

const AIRPORTS_URL = "https://davidmegginson.github.io/ourairports-data/airports.csv";
const NAVAIDS_URL = "https://davidmegginson.github.io/ourairports-data/navaids.csv";
const FIXES_URL = import.meta.env.VITE_FIXES_URL as string | undefined;

interface Cand {
  ident: string;
  lat: number;
  lon: number;
  type: string;
  name?: string;
}

let indexPromise: Promise<Map<string, Cand[]>> | null = null;

async function fetchRows(url: string): Promise<string[][]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return parseCsv(await res.text());
}

function addCand(map: Map<string, Cand[]>, c: Cand) {
  const list = map.get(c.ident);
  if (list) list.push(c);
  else map.set(c.ident, [c]);
}

async function buildIndex(): Promise<Map<string, Cand[]>> {
  const map = new Map<string, Cand[]>();

  try {
    const rows = await fetchRows(AIRPORTS_URL);
    const h = rows[0];
    const [ii, la, lo, nm] = ["ident", "latitude_deg", "longitude_deg", "name"].map((c) => h.indexOf(c));
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const id = (row[ii] ?? "").trim().toUpperCase();
      const lat = parseFloat(row[la]);
      const lon = parseFloat(row[lo]);
      if (id && Number.isFinite(lat) && Number.isFinite(lon))
        addCand(map, { ident: id, lat, lon, type: "airport", name: row[nm] });
    }
  } catch {
    /* offline / blocked — airports just won't resolve */
  }

  try {
    const rows = await fetchRows(NAVAIDS_URL);
    const h = rows[0];
    const [ii, la, lo, nm, ty] = ["ident", "latitude_deg", "longitude_deg", "name", "type"].map((c) =>
      h.indexOf(c),
    );
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const id = (row[ii] ?? "").trim().toUpperCase();
      const lat = parseFloat(row[la]);
      const lon = parseFloat(row[lo]);
      if (id && Number.isFinite(lat) && Number.isFinite(lon)) {
        const kind = (row[ty] ?? "").toLowerCase().includes("ndb") ? "ndb" : "vor";
        addCand(map, { ident: id, lat, lon, type: kind, name: row[nm] });
      }
    }
  } catch {
    /* ignore */
  }

  if (FIXES_URL) {
    try {
      const rows = await fetchRows(FIXES_URL);
      const h = rows[0];
      const [ii, la, lo] = ["ident", "lat", "lon"].map((c) => h.indexOf(c));
      for (let r = 1; r < rows.length; r++) {
        const row = rows[r];
        const id = (row[ii] ?? "").trim().toUpperCase();
        const lat = parseFloat(row[la]);
        const lon = parseFloat(row[lo]);
        if (id && Number.isFinite(lat) && Number.isFinite(lon))
          addCand(map, { ident: id, lat, lon, type: "fix", name: id });
      }
    } catch {
      /* ignore */
    }
  }

  return map;
}

function index(): Promise<Map<string, Cand[]>> {
  if (!indexPromise) indexPromise = buildIndex();
  return indexPromise;
}

const PRIORITY: Record<string, number> = { airport: 0, vor: 1, ndb: 2, fix: 3 };

export async function resolveIdentsClient(idents: string[]): Promise<ResolveResult> {
  const map = await index();
  const upper = idents.map((i) => i.trim().toUpperCase()).filter(Boolean);

  const anchors: [number, number][] = [];
  for (const id of new Set(upper)) {
    const airports = (map.get(id) ?? []).filter((c) => c.type === "airport");
    if (airports.length === 1) anchors.push([airports[0].lat, airports[0].lon]);
  }
  const nearest = (c: Cand) =>
    anchors.length ? Math.min(...anchors.map((a) => gcDistanceNm(c.lat, c.lon, a[0], a[1]))) : 0;

  const res: ResolveResult = {};
  for (const id of upper) {
    const cands = map.get(id);
    if (!cands || cands.length === 0) {
      res[id] = null;
      continue;
    }
    const best = cands
      .slice()
      .sort((a, b) => nearest(a) - nearest(b) || PRIORITY[a.type] - PRIORITY[b.type])[0];
    res[id] = { ident: best.ident, lat: best.lat, lon: best.lon, type: best.type, name: best.name ?? null } as Waypoint;
  }
  return res;
}
