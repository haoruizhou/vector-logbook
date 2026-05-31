"""OpenAIP reporting-points (rpp) provider. Parses a per-country GeoJSON export
(https://storage.googleapis.com/<bucket>/<cc>_rpp.geojson) into unified rows.

OpenAIP data is CC BY-NC-SA: attribution + ShareAlike apply to the bundle."""

import json


def parse_rpp_geojson(text: str, country: str) -> list[dict]:
    out: list[dict] = []
    doc = json.loads(text)
    for feat in doc.get("features", []):
        geom = feat.get("geometry") or {}
        coords = geom.get("coordinates") if geom.get("type") == "Point" else None
        props = feat.get("properties") or {}
        ident = (props.get("name") or "").strip().upper()
        if not ident or not coords or len(coords) < 2:
            continue
        try:
            lon, lat = float(coords[0]), float(coords[1])
        except (TypeError, ValueError):
            continue
        out.append(
            {
                "ident": ident,
                "type": "fix",
                "lat": lat,
                "lon": lon,
                "name": props.get("name"),
                "country": country.upper(),
                "source": "openaip",
            }
        )
    return out
