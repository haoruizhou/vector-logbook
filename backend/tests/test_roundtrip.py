from app.foreflight.exporter import build_foreflight_csv
from app.foreflight.importer import parse_foreflight_csv


def test_import_export_roundtrip(sample_csv_path):
    original = parse_foreflight_csv(sample_csv_path.read_text())
    csv_text = build_foreflight_csv(original.aircraft, original.flights)
    reparsed = parse_foreflight_csv(csv_text)
    assert len(reparsed.flights) == len(original.flights)
    assert len(reparsed.aircraft) == len(original.aircraft)
    a = original.flights[0]
    b = next(
        f for f in reparsed.flights
        if f["date"] == a["date"] and f.get("to") == a.get("to") and f.get("route") == a.get("route")
    )
    for k in ("from_", "to", "route", "total_time", "pilot_comments"):
        assert a.get(k) == b.get(k)
