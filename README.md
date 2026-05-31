# VECTOR — Self-Hosted Flight Logbook

A private, self-hosted flight logbook that **replaces ForeFlight** while staying
fully compatible with its CSV format. Import your existing ForeFlight export,
add/edit/delete flights, and export back to ForeFlight any time — no lock-in.
Click any flight to see its route on a map: a great-circle line for direct
airport-to-airport legs, or the full waypoint path when a route is entered.

- **Frontend:** React + TypeScript + Vite, Leaflet maps
- **Backend:** Python + FastAPI + SQLite
- **Packaging:** one Docker image (SPA served by the API)
- **Auth:** none in-app — designed to sit behind a Cloudflare tunnel / Access

Light and dark themes (with an auto option that follows your system).

## Features

- Lossless ForeFlight CSV import/export (every column preserved; re-imports dedupe)
- Full CRUD for flights and aircraft, persisted in SQLite
- Per-flight map with great-circle distance, or multi-leg route polyline
- Coordinate resolution from bundled, auto-refreshed datasets
  (OurAirports airports + navaids), with proximity-based disambiguation of
  colliding identifiers (e.g. `SLI` → Seal Beach, not the Colombian NDB)
- Totals dashboard (time by year / aircraft, PIC, night, XC, instrument, landings)
- FAA **and** Transport Canada currency tracking computed from your logbook
- Responsive desktop + mobile UI

## Run it

```bash
docker compose up -d --build
```

Open <http://localhost:8000>, go to **Import**, and drop your ForeFlight
`logbook.csv`. Your data lives in the `logbook-data` Docker volume; export any
time from the Import/Export page.

### Configuration (environment variables)

| Variable | Default | Purpose |
| --- | --- | --- |
| `LOGBOOK_DATA_DIR` | `/data` | Where the SQLite DB is stored |
| `LOGBOOK_REFRESH_INTERVAL_DAYS` | `7` | Coordinate dataset refresh cadence |
| `LOGBOOK_TILE_URL_LIGHT` | CARTO light | Map tiles for the light theme |
| `LOGBOOK_TILE_URL_DARK` | CARTO dark | Map tiles for the dark theme |

Coordinate datasets are baked into the image (so first boot works offline) and
refreshed on the schedule above; you can also trigger a manual refresh from the
Import page.

## Put it behind your domain with cloudflared

The app has no login of its own. Gate access with a Cloudflare Tunnel, and
(recommended) a Cloudflare Access policy so only you can reach it.

**Quick tunnel (testing):**

```bash
cloudflared tunnel --url http://localhost:8000
```

**Named tunnel (persistent, your domain):**

```bash
cloudflared tunnel login
cloudflared tunnel create vector-logbook
cloudflared tunnel route dns vector-logbook logbook.example.com
```

`~/.cloudflared/config.yml`:

```yaml
tunnel: vector-logbook
credentials-file: /root/.cloudflared/<TUNNEL_ID>.json
ingress:
  - hostname: logbook.example.com
    service: http://localhost:8000
  - service: http_status:404
```

```bash
cloudflared tunnel run vector-logbook
```

Then in the Cloudflare Zero Trust dashboard, add an **Access** application for
`logbook.example.com` with a policy limited to your email. The app trusts that
Cloudflare Access has authenticated the request.

## Public demo (Cloudflare Pages)

A read-only demo with five **redacted** sample flights (no real personal data)
can be deployed to Cloudflare Pages — a static build with no backend:

```bash
cd frontend
npm run build:demo          # builds with VITE_DEMO=1 → frontend/dist
npx wrangler pages deploy dist --project-name=vector-logbook-demo
```

In demo mode the app swaps the API for a bundled fixture (`src/demo.ts`):
import/export, dataset refresh, and all add/edit/delete are disabled. The
included GitHub Actions workflow (`.github/workflows/deploy-demo.yml`) deploys it
on push — set the `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repo
secrets. (`public/_redirects` handles SPA client-side routing on Pages.)

## Coordinate datasets & the fixes pipeline

- **Airports & navaids:** OurAirports (CC0), fetched at build time and refreshed
  at runtime. Identifier collisions (e.g. `SLI`) are disambiguated by proximity
  to the flight's airports.
- **Enroute fixes:** the FAA NASR subscription is a ~250 MB zip behind a WAF.
  Rather than have every instance download it, `.github/workflows/update-fixes.yml`
  runs `backend/scripts/build_fixes.py` on a schedule, extracts the fixes, and
  publishes a slim ~3 MB `fixes.csv` as a **release asset**. Point your instance
  at it:

  ```
  LOGBOOK_FIXES_URL=https://github.com/<owner>/<repo>/releases/latest/download/fixes.csv
  ```

  A bundled snapshot in the image is the offline / first-boot fallback.

## Development

Backend:

```bash
cd backend
uv sync
uv run uvicorn app.main:app --reload      # http://localhost:8000
uv run pytest                             # tests
```

Frontend (proxies `/api` to the backend on :8000):

```bash
cd frontend
npm install
npm run dev                               # http://localhost:5173
npx vitest run                            # tests
```

## ForeFlight CSV format

A single CSV with two sections — an **Aircraft Table** and a **Flights Table**,
each preceded by a marker row and a header row, separated by blank lines, with a
required banner row at the top. The importer matches columns by header name (so
it tolerates ForeFlight version differences) and is forgiving of missing
From/To, quoted remarks, semicolon-delimited crew fields, and `TRUE` flags.
Export reproduces the same structure for clean round-tripping.

## Data & licensing

The bundled `fixes.csv` combines three sources: FAA NASR data (US public domain),
OpenAIP reporting points (CC BY-NC-SA 4.0 — attribution and ShareAlike required,
non-commercial use only), and open flightmaps designated points (OFMA General
Users' License — attribution required). Because the bundle includes OpenAIP data,
the dataset as a whole is CC BY-NC-SA: non-commercial use, with attribution, and
any redistribution must keep the same license. See
`backend/datasets/bundled/ATTRIBUTION.md` for the full source-by-source breakdown.

> Currency calculations are an aid, not legal authority — always verify against
> the regulations (14 CFR Part 61 / CARs Part 401).
