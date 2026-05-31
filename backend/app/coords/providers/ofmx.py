"""open flightmaps (OFMX) designated-point provider. Parses Dpn elements from an
OFMX snapshot into unified rows. Data under the OFMA General Users' License
(attribution required)."""

from xml.etree import ElementTree


def parse_ofmx_coord(s: str) -> float:
    """Parse an OFMX coordinate into signed decimal degrees. Live OFMX snapshots
    encode decimal degrees with a hemisphere suffix, e.g. '47.33611111N' /
    '009.62222222E' (verified 2026-05-31)."""
    s = s.strip()
    hemi = s[-1:].upper()
    if hemi not in ("N", "S", "E", "W"):
        raise ValueError(f"invalid OFMX coordinate (no hemisphere): {s!r}")
    val = float(s[:-1])
    return -val if hemi in ("S", "W") else val


def parse_designated_points(xml_text: str) -> list[dict]:
    out: list[dict] = []
    root = ElementTree.fromstring(xml_text)
    for dpn in root.iter("Dpn"):
        uid = dpn.find("DpnUid")
        if uid is None:
            continue
        ident = (uid.findtext("codeId") or "").strip().upper()
        lat_s = (uid.findtext("geoLat") or "").strip()
        lon_s = (uid.findtext("geoLong") or "").strip()
        if not ident or not lat_s or not lon_s:
            continue
        try:
            lat, lon = parse_ofmx_coord(lat_s), parse_ofmx_coord(lon_s)
        except (ValueError, IndexError):
            continue
        out.append(
            {
                "ident": ident,
                "type": "fix",
                "lat": lat,
                "lon": lon,
                "name": dpn.findtext("txtName") or ident,
                "country": uid.get("region"),
                "source": "ofmx",
            }
        )
    return out
