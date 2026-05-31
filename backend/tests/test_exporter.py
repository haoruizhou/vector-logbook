from app.foreflight.exporter import build_foreflight_csv


def test_export_has_banner_and_tables():
    csv_text = build_foreflight_csv(
        [{"aircraft_id": "N12345", "make": "Cessna"}],
        [{"date": "2025-01-01", "from_": "KSBA", "to": "KIZA", "total_time": "1.0"}],
    )
    assert "ForeFlight Logbook Import" in csv_text
    assert "Aircraft Table" in csv_text
    assert "Flights Table" in csv_text
    assert "N12345" in csv_text
    assert "KSBA" in csv_text
