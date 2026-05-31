from app.coords.providers.faa import parse_fix_base

FIX_BASE = (
    "FIX_ID,LAT_DECIMAL,LONG_DECIMAL,COUNTRY_CODE\n"
    "VPSMS,32.84,-117.25166666,US\n"
    "BADROW,,,US\n"  # missing coords -> skipped
)


def test_parse_fix_base_maps_and_skips_incomplete():
    rows = parse_fix_base(FIX_BASE)
    assert len(rows) == 1
    r = rows[0]
    assert r["ident"] == "VPSMS"
    assert r["type"] == "fix"
    assert abs(r["lat"] - 32.84) < 1e-6
    assert r["country"] == "US"
    assert r["source"] == "faa-nasr"
