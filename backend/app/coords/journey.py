"""Aggregate a list of flights into the Journey payload.

Resolution happens per flight (the resolver disambiguates colliding idents by
the airports of a single flight), then results are unioned into airport, leg,
identity, and milestone collections. The TS mirror lives in
frontend/src/lib/journey.ts — keep the two in sync (see the shared contract in
docs/superpowers/plans/2026-05-31-journey-page.md)."""
from collections.abc import Callable, Iterable

from app.coords.geo import gc_distance_nm

ResolveFn = Callable[[list[str]], dict[str, dict | None]]

_TIERS = [10, 25, 50, 100]


def _f(v) -> float:
    try:
        return float(v)
    except (TypeError, ValueError):
        return 0.0


def _idents(f: dict) -> list[str]:
    mid = (f.get("route") or "").split()
    return [x for x in [f.get("from_"), *mid, f.get("to")] if x]


def _person_name(raw) -> str:
    if not raw:
        return ""
    return str(raw).split(";")[0].strip()


def build_journey(flights: Iterable[dict], resolve: ResolveFn) -> dict:
    flights = list(flights)

    airports: dict[str, dict] = {}        # ident -> airport record
    legs: dict[tuple[str, str], dict] = {}
    aircraft_counts: dict[str, int] = {}
    people: set[str] = set()
    countries: set[str] = set()
    total_hours = night_hours = 0.0
    first_date: str | None = None
    longest_leg = 0.0

    # For milestone date tracking we iterate oldest first.
    def datekey(f):
        return f.get("date") or ""

    ordered = sorted(flights, key=datekey)

    seen_airports: set[str] = set()
    seen_countries: set[str] = set()
    airport_tier_dates: dict[int, str | None] = {}
    first_intl_date: str | None = None

    for f in flights:
        total_hours += _f(f.get("total_time"))
        night_hours += _f(f.get("night"))
        ac = (f.get("aircraft_id") or "").strip()
        if ac:
            aircraft_counts[ac] = aircraft_counts.get(ac, 0) + 1
        for n in range(1, 7):
            nm = _person_name(f.get(f"person{n}"))
            if nm:
                people.add(nm)
        d = f.get("date")
        if d and (first_date is None or d < first_date):
            first_date = d

    for f in ordered:
        idents = _idents(f)
        resolved = resolve(idents)
        pts = [resolved.get(i) for i in idents]
        pts = [p for p in pts if p]
        if len(pts) < 2:
            continue
        d = f.get("date")

        # Endpoints (first/last *resolved* of from_/to specifically).
        src = resolved.get(f.get("from_") or "")
        dst = resolved.get(f.get("to") or "")

        # Airports = resolved airport-type endpoints, counted at most once per
        # flight (a round-trip like KSBA→KSBA is a single visit, per the spec).
        endpoints = {}
        for p in (src, dst):
            if p and p.get("type") == "airport":
                endpoints[p["ident"]] = p
        for p in endpoints.values():
            rec = airports.get(p["ident"])
            if not rec:
                rec = {
                    "ident": p["ident"], "name": p.get("name"), "country": p.get("country"),
                    "lat": p["lat"], "lon": p["lon"], "visits": 0,
                    "first_date": None, "last_date": None,
                }
                airports[p["ident"]] = rec
            rec["visits"] += 1
            if d:
                if rec["first_date"] is None or d < rec["first_date"]:
                    rec["first_date"] = d
                if rec["last_date"] is None or d > rec["last_date"]:
                    rec["last_date"] = d
            if p.get("country"):
                countries.add(p["country"])

        # Leg keyed by resolved from/to endpoints.
        if src and dst:
            key = (src["ident"], dst["ident"])
            leg = legs.get(key)
            if not leg:
                leg = {
                    "from_ident": src["ident"], "to_ident": dst["ident"],
                    "from_lat": src["lat"], "from_lon": src["lon"],
                    "to_lat": dst["lat"], "to_lon": dst["lon"],
                    "count": 0, "last_date": None,
                }
                legs[key] = leg
            leg["count"] += 1
            if d and (leg["last_date"] is None or d > leg["last_date"]):
                leg["last_date"] = d
            longest_leg = max(longest_leg, gc_distance_nm(src["lat"], src["lon"], dst["lat"], dst["lon"]))

        # Milestone bookkeeping (oldest-first).
        flight_countries = {p.get("country") for p in (src, dst) if p and p.get("country")}
        for c in flight_countries:
            seen_countries.add(c)
        if first_intl_date is None and len(seen_countries) >= 2:
            first_intl_date = d
        for p in (src, dst):
            if p and p.get("type") == "airport":
                seen_airports.add(p["ident"])
        for tier in _TIERS:
            if tier not in airport_tier_dates and len(seen_airports) >= tier:
                airport_tier_dates[tier] = d

    airport_list = list(airports.values())
    home_base = max(airport_list, key=lambda a: a["visits"], default=None)
    home_base_ident = home_base["ident"] if home_base else None

    furthest = 0.0
    if home_base:
        for a in airport_list:
            if a["ident"] == home_base_ident:
                continue
            furthest = max(furthest, gc_distance_nm(home_base["lat"], home_base["lon"], a["lat"], a["lon"]))

    callsign = max(aircraft_counts, key=aircraft_counts.get, default=None) if aircraft_counts else None

    leg_list = list(legs.values())
    longest_leg_obj = max(leg_list, key=lambda lg: gc_distance_nm(lg["from_lat"], lg["from_lon"], lg["to_lat"], lg["to_lon"]), default=None)

    milestones: list[dict] = []
    if first_date is not None or flights:
        milestones.append({"key": "first_flight", "label": "First flight", "date": first_date})
    if len(countries) >= 2:
        milestones.append({"key": "first_international", "label": "First international", "date": first_intl_date})
    for tier in _TIERS:
        if len(airports) >= tier:
            milestones.append({"key": f"airports_{tier}", "label": f"{tier} airports", "date": airport_tier_dates.get(tier)})
    if longest_leg_obj is not None:
        milestones.append({"key": "longest_journey", "label": "Longest journey", "date": longest_leg_obj["last_date"]})

    return {
        "airports": airport_list,
        "legs": leg_list,
        "identity": {
            "callsign": callsign,
            "first_flight_year": first_date[:4] if first_date else None,
            "home_base": home_base_ident,
            "total_hours": round(total_hours, 1),
            "airport_count": len(airports),
            "country_count": len(countries),
            "aircraft_count": len(aircraft_counts),
            "people_count": len(people),
            "night_hours": round(night_hours, 1),
            "longest_leg_nm": round(longest_leg),
            "furthest_from_home_nm": round(furthest),
        },
        "milestones": milestones,
    }
