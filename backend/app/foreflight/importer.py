import csv
import io
from dataclasses import dataclass, field

from app.foreflight.columns import AIRCRAFT_HEADER_TO_FIELD, FLIGHT_HEADER_TO_FIELD


@dataclass
class ParsedLogbook:
    aircraft: list[dict] = field(default_factory=list)
    flights: list[dict] = field(default_factory=list)
    skipped: int = 0


def _clean(v: str | None) -> str | None:
    if v is None:
        return None
    v = v.strip()
    return v or None


def parse_foreflight_csv(text: str) -> ParsedLogbook:
    """Parse a ForeFlight logbook CSV (two tables) into aircraft + flight dicts.

    Tolerant of: missing From/To, quoted fields with commas, semicolon-delimited
    people fields, blank separator rows, and trailing empty columns. Header order
    is matched by name so it survives ForeFlight version changes.
    """
    rows = list(csv.reader(io.StringIO(text)))
    out = ParsedLogbook()
    section: str | None = None  # aircraft_header | flights_header | aircraft | flights
    header_map: dict[int, str] = {}

    for row in rows:
        first = row[0].strip() if row else ""
        if first.startswith("Aircraft Table"):
            section, header_map = "aircraft_header", {}
            continue
        if first.startswith("Flights Table"):
            section, header_map = "flights_header", {}
            continue
        if section in ("aircraft_header", "flights_header"):
            lookup = (
                AIRCRAFT_HEADER_TO_FIELD
                if section == "aircraft_header"
                else FLIGHT_HEADER_TO_FIELD
            )
            header_map = {i: lookup[h.strip()] for i, h in enumerate(row) if h.strip() in lookup}
            section = "aircraft" if section == "aircraft_header" else "flights"
            continue
        if section in ("aircraft", "flights"):
            if not any(c.strip() for c in row):
                continue  # blank separator row
            rec = {header_map[i]: _clean(row[i]) for i in header_map if i < len(row)}
            if section == "aircraft":
                if rec.get("aircraft_id"):
                    out.aircraft.append(rec)
                else:
                    out.skipped += 1
            else:
                if rec.get("date"):
                    out.flights.append(rec)
                else:
                    out.skipped += 1
    return out
