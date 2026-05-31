import json

from app.coords.providers.openaip import parse_rpp_geojson

GEOJSON = json.dumps(
    {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {"name": "Sierra"},
                "geometry": {"type": "Point", "coordinates": [13.5, 47.1]},
            },
            {  # no geometry -> skipped
                "type": "Feature",
                "properties": {"name": "Bad"},
                "geometry": None,
            },
        ],
    }
)


def test_parse_rpp_geojson():
    rows = parse_rpp_geojson(GEOJSON, country="AT")
    assert len(rows) == 1
    r = rows[0]
    assert r["ident"] == "SIERRA"
    assert r["type"] == "fix"
    assert abs(r["lat"] - 47.1) < 1e-6
    assert abs(r["lon"] - 13.5) < 1e-6
    assert r["country"] == "AT"
    assert r["source"] == "openaip"
