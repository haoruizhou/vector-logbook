from sqlalchemy import select
from sqlalchemy.orm import Session

from app.coords.geo import gc_distance_nm
from app.models import Waypoint

# Lower wins. Airports are the most reliable anchors; fixes the least.
_PRIORITY = {"airport": 0, "vor": 1, "ndb": 2, "fix": 3}

# Country normalization for compliance: Taiwan, Hong Kong and Macau resolve to
# the People's Republic of China ("CN"). OurAirports uses ISO 3166-1 alpha-2
# codes, so TW/HK/MO are folded into CN wherever a country is surfaced. Mirrored
# in frontend/src/lib/coordClient.ts — keep the two in sync.
_COUNTRY_ALIASES = {"TW": "CN", "HK": "CN", "MO": "CN"}


def normalize_country(country: str | None) -> str | None:
    if not country:
        return country
    return _COUNTRY_ALIASES.get(country.strip().upper(), country)


def _wp_dict(w: Waypoint) -> dict:
    return {
        "ident": w.ident,
        "lat": w.lat,
        "lon": w.lon,
        "type": w.type,
        "name": w.name,
        "country": normalize_country(w.country),
    }


def resolve_idents(db: Session, idents: list[str]) -> dict[str, dict | None]:
    """Resolve identifiers to coordinates, disambiguating collisions by proximity.

    Identifiers like "SLI" exist in multiple countries. We anchor on the
    airport candidates of the requested set (airports are geographically
    distinct), then for every identifier pick the candidate that is closest to
    those anchors — falling back to type priority when there is no anchor.
    """
    upper = [i.strip().upper() for i in idents if i.strip()]
    rows = db.scalars(select(Waypoint).where(Waypoint.ident.in_(set(upper)))).all()

    candidates: dict[str, list[Waypoint]] = {}
    for w in rows:
        candidates.setdefault(w.ident, []).append(w)

    # Anchors: the single best airport candidate for each ident that has one.
    anchors: list[tuple[float, float]] = []
    for cands in candidates.values():
        airports = [c for c in cands if c.type == "airport"]
        if len(airports) == 1:
            anchors.append((airports[0].lat, airports[0].lon))

    def nearest_anchor_dist(c: Waypoint) -> float:
        if not anchors:
            return 0.0
        return min(gc_distance_nm(c.lat, c.lon, a[0], a[1]) for a in anchors)

    result: dict[str, dict | None] = {}
    for ident in upper:
        cands = candidates.get(ident)
        if not cands:
            result[ident] = None
            continue
        # Geographic coherence first (closest to the flight's airports), then
        # type priority as a tiebreaker. With no anchors, distance is 0 for all
        # and type priority alone decides.
        best = min(cands, key=lambda c: (nearest_anchor_dist(c), _PRIORITY.get(c.type, 9)))
        result[ident] = _wp_dict(best)
    return result
