from app.coords.datasets import load_fixes_csv


def test_load_fixes_reads_source_per_row():
    text = (
        "ident,type,lat,lon,name,country,source\n"
        "ABETI,fix,47.2,13.5,ABETI,LO,ofmx\n"
        "SIERRA,fix,47.1,13.6,Sierra,AT,openaip\n"
    )
    rows = load_fixes_csv(text)
    assert {r["ident"]: r["source"] for r in rows} == {"ABETI": "ofmx", "SIERRA": "openaip"}


def test_load_fixes_defaults_legacy_rows_to_faa():
    text = "ident,type,lat,lon,name,country\nVPSMS,fix,32.84,-117.25,VPSMS,US\n"
    rows = load_fixes_csv(text)
    assert rows[0]["source"] == "faa-nasr"
