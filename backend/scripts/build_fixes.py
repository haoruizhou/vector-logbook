"""Build the slim multi-region enroute-fix bundle published by CI.

Merges three sources into datasets/bundled/fixes.csv (ident,type,lat,lon,name,
country,source):
  - faa-nasr : US IFR enroute intersections (FAA NASR subscription)
  - openaip  : worldwide VFR reporting points (OpenAIP, CC BY-NC-SA)
  - ofmx     : designated points (open flightmaps, OFMA license)

A provider that errors is logged and skipped; the bundle is then validated
(assert_bundle_ok) so a broken/empty merge fails the build and the last good
GitHub release is preserved. Run from backend/: uv run python scripts/build_fixes.py
"""

import csv
import io
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree

import httpx

# Allow running as a plain script (python scripts/build_fixes.py): ensure the
# backend/ dir is importable so `app.*` resolves regardless of cwd / sys.path[0].
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.coords.providers.faa import parse_fix_base  # noqa: E402
from app.coords.providers.ofmx import parse_designated_points  # noqa: E402
from app.coords.providers.openaip import parse_rpp_geojson  # noqa: E402
from app.coords.providers.validate import assert_bundle_ok  # noqa: E402

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124 Safari/537.36"
APRA = "https://external-api.faa.gov/apra/nfdc/nasr/chart?edition=current"
OUT = Path(__file__).parent.parent / "datasets" / "bundled" / "fixes.csv"
FIELDS = ["ident", "type", "lat", "lon", "name", "country", "source"]

# OpenAIP per-country GeoJSON export bucket (verified live 2026-05-31:
# <cc>_rpp.geojson returns 200 with properties.name + Point geometry).
OPENAIP_BUCKET = "https://storage.googleapis.com/29f98e10-a489-4c82-ae5e-489dbcd4912f"
OPENAIP_COUNTRIES = ["CA", "AU", "GB", "DE", "FR", "ES", "IT", "NL", "BE", "CH", "AT", "IE", "ZA"]

# open flightmaps OFMX snapshots — an S3-style GCS bucket. Layout (verified live
# 2026-05-31): live/<CYCLE>/ofmx/<FIR>/latest/isolated/ofmx_<area>.xml, where
# CYCLE is an AIRAC YYNN that rolls and the FIR folder code differs from the
# file's area code. We discover the current cycle + region files dynamically.
OFMX_BUCKET = "https://snapshots.openflightmaps.org"
_S3_NS = {"s3": "http://doc.s3.amazonaws.com/2006-03-01"}


def log(msg: str) -> None:
    print(msg, file=sys.stderr)


def fetch_faa() -> list[dict]:
    xml = httpx.get(APRA, timeout=60, follow_redirects=True).text
    root = ElementTree.fromstring(xml)
    ns = {"a": "http://arpa.ait.faa.gov/arpa_response"}
    product = root.find(".//a:product", ns)
    if product is None or not product.get("url"):
        raise RuntimeError("no current NASR subscription URL")
    url = product.get("url")
    log(f"FAA: downloading {url}")
    with httpx.Client(timeout=600, follow_redirects=True, headers={"User-Agent": UA}) as c:
        sub = c.get(url).content
    with zipfile.ZipFile(io.BytesIO(sub)) as outer:
        inner_name = next(n for n in outer.namelist() if n.endswith("_CSV.zip"))
        with zipfile.ZipFile(io.BytesIO(outer.read(inner_name))) as inner:
            fix_base = inner.read("FIX_BASE.csv").decode("utf-8-sig")
    return parse_fix_base(fix_base)


def fetch_openaip() -> list[dict]:
    rows: list[dict] = []
    with httpx.Client(timeout=120, follow_redirects=True) as c:
        for cc in OPENAIP_COUNTRIES:
            url = f"{OPENAIP_BUCKET}/{cc.lower()}_rpp.geojson"
            try:
                resp = c.get(url)
                if resp.status_code != 200:
                    log(f"OpenAIP: {cc} -> HTTP {resp.status_code}, skipping")
                    continue
                rows.extend(parse_rpp_geojson(resp.text, country=cc))
            except Exception as e:  # noqa: BLE001
                log(f"OpenAIP: {cc} failed: {e}")
    return rows


def _ofmx_list_keys(c: httpx.Client, prefix: str):
    """Yield object keys under a prefix via the bucket's S3-style XML listing."""
    marker = ""
    while True:
        r = c.get(OFMX_BUCKET + "/", params={"prefix": prefix, "marker": marker, "max-keys": 1000})
        r.raise_for_status()
        root = ElementTree.fromstring(r.text)
        keys = [k.text for k in root.findall("s3:Contents/s3:Key", _S3_NS) if k.text]
        yield from keys
        truncated = (root.findtext("s3:IsTruncated", namespaces=_S3_NS) or "false").lower() == "true"
        if not truncated or not keys:
            break
        marker = keys[-1]


def _is_region_xml(key: str) -> bool:
    return (
        "/isolated/ofmx_" in key
        and key.endswith(".xml")
        and not key.endswith("_ofmShapeExtension.xml")
    )


def _latest_ofmx_cycle(c: httpx.Client) -> str | None:
    """Highest live/<cycle>/ that actually contains an OFMX region XML."""
    r = c.get(OFMX_BUCKET + "/", params={"prefix": "live/", "delimiter": "/"})
    root = ElementTree.fromstring(r.text)
    cycles = []
    for p in root.findall("s3:CommonPrefixes/s3:Prefix", _S3_NS):
        cyc = (p.text or "").removeprefix("live/").rstrip("/")
        if cyc.isdigit():
            cycles.append(cyc)
    for cyc in sorted(cycles, reverse=True):
        if any(_is_region_xml(k) for k in _ofmx_list_keys(c, f"live/{cyc}/ofmx/")):
            return cyc
    return None


def fetch_ofmx() -> list[dict]:
    rows: list[dict] = []
    with httpx.Client(timeout=300, follow_redirects=True) as c:
        cycle = _latest_ofmx_cycle(c)
        if not cycle:
            log("OFMX: no published cycle found, skipping")
            return rows
        keys = [k for k in _ofmx_list_keys(c, f"live/{cycle}/ofmx/") if _is_region_xml(k)]
        log(f"OFMX: cycle {cycle}, {len(keys)} region files")
        for k in keys:
            try:
                resp = c.get(f"{OFMX_BUCKET}/{k}")
                if resp.status_code != 200:
                    log(f"OFMX: {k} -> HTTP {resp.status_code}, skipping")
                    continue
                rows.extend(parse_designated_points(resp.text))
            except Exception as e:  # noqa: BLE001
                log(f"OFMX: {k} failed: {e}")
    return rows


def collect() -> list[dict]:
    merged: list[dict] = []
    # FAA is the baseline; let its failure surface (validation would fail anyway).
    merged.extend(fetch_faa())
    for name, fn in [("openaip", fetch_openaip), ("ofmx", fetch_ofmx)]:
        try:
            got = fn()
            log(f"{name}: {len(got)} rows")
            merged.extend(got)
        except Exception as e:  # noqa: BLE001
            log(f"{name}: provider failed entirely, skipping: {e}")
    return merged


def main() -> None:
    rows = collect()
    assert_bundle_ok(rows)  # raises -> non-zero exit -> CI keeps last good release
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with OUT.open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=FIELDS)
        w.writeheader()
        w.writerows(rows)
    by_source: dict[str, int] = {}
    for r in rows:
        by_source[r["source"]] = by_source.get(r["source"], 0) + 1
    log(f"wrote {len(rows)} fixes to {OUT} :: {by_source}")


if __name__ == "__main__":
    main()
