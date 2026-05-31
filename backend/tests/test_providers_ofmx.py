import pytest

from app.coords.providers.ofmx import parse_designated_points, parse_ofmx_coord


def test_parse_ofmx_coord_rejects_missing_hemisphere():
    with pytest.raises(ValueError):
        parse_ofmx_coord("47.33611111")


def test_parse_ofmx_coord_decimal_with_hemisphere():
    assert abs(parse_ofmx_coord("47.33611111N") - 47.33611111) < 1e-8
    assert abs(parse_ofmx_coord("009.62222222E") - 9.62222222) < 1e-8
    assert parse_ofmx_coord("009.62222222W") < 0
    assert parse_ofmx_coord("47.33611111S") < 0


OFMX = """<?xml version="1.0"?>
<OFMX-Snapshot>
  <Dpn>
    <DpnUid region="LOVV">
      <codeId>ABETI</codeId>
      <geoLat>47.20000000N</geoLat>
      <geoLong>013.50000000E</geoLong>
    </DpnUid>
    <txtName>ABETI</txtName>
  </Dpn>
  <Dpn>
    <DpnUid region="LOVV">
      <codeId></codeId>
      <geoLat>47.20000000N</geoLat>
      <geoLong>013.50000000E</geoLong>
    </DpnUid>
  </Dpn>
</OFMX-Snapshot>"""


def test_parse_designated_points_maps_and_skips_blank_ident():
    rows = parse_designated_points(OFMX)
    assert len(rows) == 1
    r = rows[0]
    assert r["ident"] == "ABETI"
    assert r["type"] == "fix"
    assert abs(r["lat"] - 47.2) < 1e-6
    assert abs(r["lon"] - 13.5) < 1e-6
    assert r["country"] == "LOVV"
    assert r["source"] == "ofmx"
