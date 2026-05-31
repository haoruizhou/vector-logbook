"""Generate a slim enroute-fix dataset from the FAA NASR subscription.

OurAirports covers airports and navaids but not enroute fixes/intersections
(e.g. VPSMS). The FAA publishes them in NASR `FIX_BASE.csv`, but only inside a
~250 MB subscription zip behind a WAF that blocks non-browser user-agents. This
script discovers the current edition, downloads it, extracts the fixes, and
writes a tiny `datasets/bundled/fixes.csv` (ident,type,lat,lon,name,country)
that ships in the image — so the running app never fetches the big file.

Run periodically (FAA updates every 28 days):
    uv run python scripts/build_fixes.py
"""

import csv
import io
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree

import httpx

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124 Safari/537.36"
APRA = "https://external-api.faa.gov/apra/nfdc/nasr/chart?edition=current"
OUT = Path(__file__).parent.parent / "datasets" / "bundled" / "fixes.csv"


def current_subscription_url() -> str:
    xml = httpx.get(APRA, timeout=60, follow_redirects=True).text
    root = ElementTree.fromstring(xml)
    ns = {"a": "http://arpa.ait.faa.gov/arpa_response"}
    product = root.find(".//a:product", ns)
    if product is None or not product.get("url"):
        raise SystemExit("could not find current NASR subscription URL")
    return product.get("url")


def slim_rows(fix_base_csv: str) -> list[dict]:
    out = []
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
                }
            )
        except ValueError:
            continue
    return out


def main() -> None:
    url = current_subscription_url()
    print(f"downloading {url}", file=sys.stderr)
    with httpx.Client(timeout=600, follow_redirects=True, headers={"User-Agent": UA}) as c:
        sub = c.get(url).content
    with zipfile.ZipFile(io.BytesIO(sub)) as outer:
        inner_name = next(n for n in outer.namelist() if n.endswith("_CSV.zip"))
        with zipfile.ZipFile(io.BytesIO(outer.read(inner_name))) as inner:
            fix_base = inner.read("FIX_BASE.csv").decode("utf-8-sig")
    rows = slim_rows(fix_base)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with OUT.open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["ident", "type", "lat", "lon", "name", "country"])
        w.writeheader()
        w.writerows(rows)
    print(f"wrote {len(rows)} fixes to {OUT}", file=sys.stderr)


if __name__ == "__main__":
    main()
