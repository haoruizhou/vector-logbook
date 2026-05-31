"""FAA NASR enroute-fix provider. Maps FIX_BASE.csv rows to the unified schema."""

import csv
import io


def parse_fix_base(fix_base_csv: str) -> list[dict]:
    out: list[dict] = []
    for r in csv.DictReader(io.StringIO(fix_base_csv)):
        ident = (r.get("FIX_ID") or "").strip().upper()
        lat, lon = r.get("LAT_DECIMAL"), r.get("LONG_DECIMAL")
        if not ident or not lat or not lon:
            continue
        try:
            out.append(
                {
                    "ident": ident,
                    "type": "fix",
                    "lat": float(lat),
                    "lon": float(lon),
                    "name": ident,
                    "country": (r.get("COUNTRY_CODE") or "").strip() or None,
                    "source": "faa-nasr",
                }
            )
        except ValueError:
            continue
    return out
