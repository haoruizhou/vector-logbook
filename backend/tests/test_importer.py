from app.foreflight.importer import parse_foreflight_csv


def test_parses_aircraft_and_flights(sample_csv_path):
    result = parse_foreflight_csv(sample_csv_path.read_text())
    assert any(a["aircraft_id"] == "N50150" for a in result.aircraft)
    f = next(
        f for f in result.flights
        if f["date"] == "2025-06-27" and f["route"] == "SLI OCN VPSMS"
    )
    assert f["from_"] == "KEMT"
    assert f["to"] == "KMYF"
    assert f["cross_country"] == "1.6"
    cw = next(
        f for f in result.flights
        if "crosswind landing" in (f.get("pilot_comments") or "")
    )
    assert "go around" in cw["pilot_comments"]


def test_handles_missing_to(sample_csv_path):
    result = parse_foreflight_csv(sample_csv_path.read_text())
    sim = next(
        f for f in result.flights
        if f["date"] == "2023-04-02" and f["aircraft_id"] == "N12345"
    )
    assert sim.get("to") in (None, "")
