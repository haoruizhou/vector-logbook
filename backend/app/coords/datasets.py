import csv
import io

import httpx

from app.config import settings

AIRPORTS_URL = "https://davidmegginson.github.io/ourairports-data/airports.csv"
NAVAIDS_URL = "https://davidmegginson.github.io/ourairports-data/navaids.csv"


def load_airports_csv(text: str) -> list[dict]:
    out: list[dict] = []
    for r in csv.DictReader(io.StringIO(text)):
        if not r.get("ident") or not r.get("latitude_deg"):
            continue
        try:
            out.append(
                {
                    "ident": r["ident"].strip().upper(),
                    "type": "airport",
                    "lat": float(r["latitude_deg"]),
                    "lon": float(r["longitude_deg"]),
                    "name": r.get("name"),
                    "country": r.get("iso_country"),
                    "source": "ourairports",
                }
            )
        except ValueError:
            continue
    return out


def load_navaids_csv(text: str) -> list[dict]:
    out: list[dict] = []
    for r in csv.DictReader(io.StringIO(text)):
        if not r.get("ident") or not r.get("latitude_deg"):
            continue
        try:
            kind = (r.get("type", "") or "").lower().split()[0] if r.get("type") else "vor"
            out.append(
                {
                    "ident": r["ident"].strip().upper(),
                    "type": "ndb" if "ndb" in kind else "vor",
                    "lat": float(r["latitude_deg"]),
                    "lon": float(r["longitude_deg"]),
                    "name": r.get("name"),
                    "country": r.get("iso_country"),
                    "source": "ourairports",
                }
            )
        except ValueError:
            continue
    return out


def load_fixes_csv(text: str) -> list[dict]:
    """Slim FAA enroute-fix CSV produced by scripts/build_fixes.py."""
    out: list[dict] = []
    for r in csv.DictReader(io.StringIO(text)):
        try:
            out.append(
                {
                    "ident": r["ident"].strip().upper(),
                    "type": "fix",
                    "lat": float(r["lat"]),
                    "lon": float(r["lon"]),
                    "name": r.get("name"),
                    "country": r.get("country"),
                    "source": (r.get("source") or "").strip() or "faa-nasr",
                }
            )
        except (ValueError, KeyError):
            continue
    return out


def _fetch(url: str) -> str:
    return httpx.get(url, timeout=60, follow_redirects=True).text


def _source_text(url: str, bundled_name: str) -> str | None:
    """Network first, then a bundled CSV fallback so first boot works offline."""
    try:
        return _fetch(url)
    except Exception:
        pass
    bundled = settings.bundled_datasets_dir / bundled_name
    if bundled.exists():
        return bundled.read_text()
    return None


def _replace_source(db, sources: list[str], rows: list[dict]) -> None:
    """Atomically swap all waypoints from the given source(s) for `rows`."""
    from app.models import Waypoint

    db.query(Waypoint).filter(Waypoint.source.in_(sources)).delete(synchronize_session=False)
    if rows:
        db.bulk_insert_mappings(Waypoint, rows)
    db.commit()


def refresh_base(db) -> dict:
    """Refresh airports + navaids from OurAirports (network, bundled fallback)."""
    collected: list[dict] = []
    counts: dict[str, int] = {}
    available = True
    for label, url, bundled_name, loader in [
        ("airports", AIRPORTS_URL, "airports.csv", load_airports_csv),
        ("navaids", NAVAIDS_URL, "navaids.csv", load_navaids_csv),
    ]:
        text = _source_text(url, bundled_name)
        rows = loader(text) if text else []
        if not rows:
            available = False
        collected.extend(rows)
        counts[label] = len(rows)
    if available and collected:
        _replace_source(db, ["ourairports"], collected)
    return counts


def refresh_fixes(db) -> dict:
    """Refresh enroute fixes from the slim published CSV, bundled as fallback.

    The heavy FAA NASR download + processing happens once centrally in CI
    (scripts/build_fixes.py via GitHub Actions), which publishes a small
    fixes.csv. Each instance just fetches that (set LOGBOOK_FIXES_URL), so no VM
    ever pulls the ~250 MB subscription. The bundled snapshot in the image is the
    offline / first-boot fallback.
    """
    rows: list[dict] = []
    source = "bundled"
    if settings.fixes_url:
        try:
            rows = load_fixes_csv(_fetch(settings.fixes_url))
            source = settings.fixes_url
        except Exception:
            rows = []
    if not rows:
        bundled = settings.bundled_datasets_dir / "fixes.csv"
        if bundled.exists():
            rows = load_fixes_csv(bundled.read_text())
    if rows:
        _replace_source(db, ["faa-nasr", "openaip", "ofmx"], rows)
    return {"fixes": len(rows), "source": source}


def refresh_waypoints(db) -> dict:
    """Full refresh of all coordinate sources (airports, navaids, fixes)."""
    counts = refresh_base(db)
    counts.update(refresh_fixes(db))
    return counts
