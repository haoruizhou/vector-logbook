from importlib import reload

from fastapi.testclient import TestClient

import app.models  # noqa: F401  ensure models are in sys.modules before any reload sequence
from app.coords.journey import build_journey


# A fake resolver: maps ident -> dict or None, ignoring per-flight context.
# (Disambiguation correctness is covered by the resolver's own tests; here we
# verify aggregation given resolved points.)
WP = {
    "KSBA": {"ident": "KSBA", "lat": 34.4262, "lon": -119.8404, "type": "airport", "name": "Santa Barbara", "country": "US"},
    "KMYF": {"ident": "KMYF", "lat": 32.8157, "lon": -117.1400, "type": "airport", "name": "Montgomery", "country": "US"},
    "KSBP": {"ident": "KSBP", "lat": 35.2368, "lon": -120.6424, "type": "airport", "name": "San Luis", "country": "US"},
    "CYYJ": {"ident": "CYYJ", "lat": 48.6469, "lon": -123.4258, "type": "airport", "name": "Victoria", "country": "CA"},
    "SLI": {"ident": "SLI", "lat": 33.783, "lon": -118.055, "type": "vor", "name": "Seal Beach", "country": None},
}

def resolve(idents):
    return {i: WP.get(i.strip().upper()) for i in idents}

def flight(**kw):
    base = {k: None for k in ("date", "aircraft_id", "from_", "to", "route", "total_time", "night")}
    base.update(kw)
    for n in range(1, 7):
        base.setdefault(f"person{n}", None)
    return base


def test_airports_visits_and_dates():
    flights = [
        flight(date="2022-01-01", from_="KSBA", to="KMYF", route="SLI"),
        flight(date="2023-05-02", from_="KMYF", to="KSBA"),
    ]
    j = build_journey(flights, resolve)
    by = {a["ident"]: a for a in j["airports"]}
    assert set(by) == {"KSBA", "KMYF"}          # SLI is a VOR, not an airport
    assert by["KSBA"]["visits"] == 2
    assert by["KSBA"]["first_date"] == "2022-01-01"
    assert by["KSBA"]["last_date"] == "2023-05-02"
    assert by["KSBA"]["country"] == "US"


def test_legs_dedup_and_count():
    flights = [
        flight(date="2022-01-01", from_="KSBA", to="KMYF"),
        flight(date="2022-02-01", from_="KSBA", to="KMYF"),
        flight(date="2022-03-01", from_="KSBA", to="KSBP"),
    ]
    j = build_journey(flights, resolve)
    legs = {(lg["from_ident"], lg["to_ident"]): lg for lg in j["legs"]}
    assert legs[("KSBA", "KMYF")]["count"] == 2
    assert legs[("KSBA", "KMYF")]["last_date"] == "2022-02-01"
    assert legs[("KSBA", "KSBP")]["count"] == 1


def test_identity_fields():
    flights = [
        flight(date="2021-06-01", from_="KSBA", to="KMYF", aircraft_id="N111", total_time="1.5", night="0.5", person1="Alice;Passenger;;"),
        flight(date="2022-07-01", from_="KSBA", to="KMYF", aircraft_id="N111", total_time="2.0"),
        flight(date="2023-08-01", from_="KSBA", to="CYYJ", aircraft_id="N222", total_time="3.0", person1="Bob"),
    ]
    j = build_journey(flights, resolve)
    idn = j["identity"]
    assert idn["callsign"] == "N111"            # most-flown tail
    assert idn["first_flight_year"] == "2021"
    assert idn["home_base"] == "KSBA"           # 3 visits
    assert idn["total_hours"] == 6.5
    assert idn["night_hours"] == 0.5
    assert idn["airport_count"] == 3
    assert idn["country_count"] == 2            # US + CA
    assert idn["aircraft_count"] == 2
    assert idn["people_count"] == 2             # Alice, Bob
    assert idn["longest_leg_nm"] > 0


def test_milestones_include_first_flight_and_international():
    flights = [
        flight(date="2021-06-01", from_="KSBA", to="KMYF"),
        flight(date="2023-08-01", from_="KSBA", to="CYYJ"),
    ]
    j = build_journey(flights, resolve)
    keys = {m["key"]: m for m in j["milestones"]}
    assert keys["first_flight"]["date"] == "2021-06-01"
    assert keys["first_international"]["date"] == "2023-08-01"


def test_round_trip_counts_airport_once():
    """A pattern flight from_ == to is a single visit, not two."""
    flights = [flight(date="2022-01-01", from_="KSBA", to="KSBA")]
    j = build_journey(flights, resolve)
    by = {a["ident"]: a for a in j["airports"]}
    assert by["KSBA"]["visits"] == 1


def test_unresolvable_flight_skipped():
    flights = [flight(date="2021-01-01", from_="ZZZZ", to="QQQQ")]
    j = build_journey(flights, resolve)
    assert j["airports"] == []
    assert j["legs"] == []
    assert j["identity"]["airport_count"] == 0


def test_journey_endpoint(tmp_path, monkeypatch):
    monkeypatch.setenv("LOGBOOK_DB_PATH", str(tmp_path / "logbook.db"))
    import app.config as config
    reload(config)
    import app.db as db
    reload(db)
    import app.models as models
    reload(models)
    import app.main as main
    reload(main)

    db.init_db()
    s = db.SessionLocal()
    s.add(models.Waypoint(ident="KSBA", type="airport", lat=34.4262, lon=-119.8404, country="US", source="t"))
    s.add(models.Waypoint(ident="KMYF", type="airport", lat=32.8157, lon=-117.14, country="US", source="t"))
    s.add(models.Flight(date="2022-01-01", from_="KSBA", to="KMYF", total_time="1.5", aircraft_id="N1"))
    s.commit()
    s.close()

    client = TestClient(main.create_app())
    r = client.get("/api/journey")
    assert r.status_code == 200
    body = r.json()
    assert {a["ident"] for a in body["airports"]} == {"KSBA", "KMYF"}
    assert body["identity"]["callsign"] == "N1"
    assert body["identity"]["airport_count"] == 2
