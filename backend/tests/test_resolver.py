from app.coords.datasets import load_airports_csv, load_fixes_csv, load_navaids_csv


def test_load_fixes():
    csv_text = "ident,type,lat,lon,name,country\nVPSMS,fix,32.84,-117.25166666,VPSMS,US\n"
    rows = load_fixes_csv(csv_text)
    assert rows[0]["ident"] == "VPSMS"
    assert rows[0]["type"] == "fix"
    assert abs(rows[0]["lat"] - 32.84) < 1e-6
    assert rows[0]["source"] == "faa-nasr"


def test_load_airports():
    csv_text = (
        "ident,type,name,latitude_deg,longitude_deg,iso_country\n"
        "KSBA,medium_airport,Santa Barbara,34.4262,-119.8404,US\n"
    )
    rows = load_airports_csv(csv_text)
    assert rows[0]["ident"] == "KSBA"
    assert abs(rows[0]["lat"] - 34.4262) < 1e-6
    assert rows[0]["type"] == "airport"


def test_load_navaids():
    csv_text = (
        "ident,name,type,latitude_deg,longitude_deg,iso_country\n"
        "GVO,Gaviota,VOR,34.5311,-120.0911,US\n"
    )
    rows = load_navaids_csv(csv_text)
    assert rows[0]["ident"] == "GVO"
    assert rows[0]["type"] == "vor"


def test_resolver_basic(db_session):
    from app.coords.resolver import resolve_idents
    from app.models import Waypoint

    db_session.add(Waypoint(ident="GVO", type="vor", lat=34.5, lon=-120.1, source="t"))
    db_session.add(Waypoint(ident="KSBA", type="airport", lat=34.4, lon=-119.8, source="t"))
    db_session.commit()
    res = resolve_idents(db_session, ["KSBA", "GVO", "ZZZZ"])
    assert res["KSBA"]["lat"] == 34.4
    assert res["GVO"]["type"] == "vor"
    assert res["ZZZZ"] is None


def test_resolver_disambiguates_by_proximity(db_session):
    """SLI exists as a US VORTAC near LA and a Colombian NDB; with LA-area
    airport anchors, the US candidate must win."""
    from app.coords.resolver import resolve_idents
    from app.models import Waypoint

    # Anchors: two LA-area airports.
    db_session.add(Waypoint(ident="KEMT", type="airport", lat=34.086, lon=-118.012, source="t"))
    db_session.add(Waypoint(ident="KMYF", type="airport", lat=32.816, lon=-117.139, source="t"))
    # SLI candidates: Seal Beach (US, near anchors) vs San Luis (Colombia, far).
    db_session.add(Waypoint(ident="SLI", type="vor", lat=33.783, lon=-118.055, source="t"))
    db_session.add(Waypoint(ident="SLI", type="ndb", lat=0.856, lon=-77.675, source="t"))
    db_session.commit()
    res = resolve_idents(db_session, ["KEMT", "SLI", "KMYF"])
    assert res["SLI"]["lat"] == 33.783  # Seal Beach, not Colombia


def test_resolver_picks_region_matching_airports(db_session):
    """A 5-letter fix name reused in two regions resolves to the one near the
    flight's airports (Europe here), proving multi-region data is safe."""
    from app.coords.resolver import resolve_idents
    from app.models import Waypoint

    # European flight anchors.
    db_session.add(Waypoint(ident="LOWW", type="airport", lat=48.110, lon=16.570, source="t"))
    db_session.add(Waypoint(ident="EDDM", type="airport", lat=48.354, lon=11.786, source="t"))
    # Same fix name in Europe (near anchors) and the US (far).
    db_session.add(Waypoint(ident="ABETI", type="fix", lat=47.9, lon=14.0, source="ofmx"))
    db_session.add(Waypoint(ident="ABETI", type="fix", lat=39.0, lon=-95.0, source="faa-nasr"))
    db_session.commit()
    res = resolve_idents(db_session, ["LOWW", "ABETI", "EDDM"])
    assert res["ABETI"]["lat"] == 47.9  # European candidate, not US


def test_resolver_surfaces_country(db_session):
    from app.coords.resolver import resolve_idents
    from app.models import Waypoint

    db_session.add(Waypoint(ident="KSBA", type="airport", lat=34.4, lon=-119.8, country="US", source="t"))
    db_session.commit()
    res = resolve_idents(db_session, ["KSBA"])
    assert res["KSBA"]["country"] == "US"


def test_resolver_folds_tw_hk_mo_into_cn(db_session):
    """Compliance: Taiwan, Hong Kong and Macau resolve to the PRC ("CN")."""
    from app.coords.resolver import normalize_country, resolve_idents
    from app.models import Waypoint

    assert normalize_country("TW") == "CN"
    assert normalize_country("HK") == "CN"
    assert normalize_country("MO") == "CN"
    assert normalize_country("US") == "US"
    assert normalize_country(None) is None

    db_session.add(Waypoint(ident="RCTP", type="airport", lat=25.077, lon=121.233, country="TW", source="t"))
    db_session.add(Waypoint(ident="VHHH", type="airport", lat=22.308, lon=113.915, country="HK", source="t"))
    db_session.commit()
    res = resolve_idents(db_session, ["RCTP", "VHHH"])
    assert res["RCTP"]["country"] == "CN"
    assert res["VHHH"]["country"] == "CN"
