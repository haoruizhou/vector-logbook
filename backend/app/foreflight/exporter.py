import csv
import io

from app.foreflight.columns import (
    AIRCRAFT_FIELD_TO_HEADER,
    AIRCRAFT_HEADERS,
    FLIGHT_FIELD_TO_HEADER,
    FLIGHT_HEADERS,
)

BANNER = (
    "ForeFlight Logbook Import",
    "This row is required for importing into ForeFlight. Do not delete or modify.",
)

# header string -> model field (inverse of *_FIELD_TO_HEADER)
_AIRCRAFT_HEADER_TO_FIELD = {h: f for f, h in AIRCRAFT_FIELD_TO_HEADER.items()}
_FLIGHT_HEADER_TO_FIELD = {h: f for f, h in FLIGHT_FIELD_TO_HEADER.items()}


def build_foreflight_csv(aircraft: list[dict], flights: list[dict]) -> str:
    """Render aircraft + flight dicts back into a ForeFlight-importable CSV."""
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(list(BANNER))
    w.writerow([])
    w.writerow(["Aircraft Table"])
    w.writerow(AIRCRAFT_HEADERS)
    for a in aircraft:
        w.writerow([a.get(_AIRCRAFT_HEADER_TO_FIELD[h]) or "" for h in AIRCRAFT_HEADERS])
    w.writerow([])
    w.writerow(["Flights Table"])
    w.writerow(FLIGHT_HEADERS)
    for f in flights:
        w.writerow([f.get(_FLIGHT_HEADER_TO_FIELD[h]) or "" for h in FLIGHT_HEADERS])
    return buf.getvalue()
