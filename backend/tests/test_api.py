from importlib import reload

from fastapi.testclient import TestClient


def test_models_create_all(db_session):
    from app.models import Aircraft, Flight

    db_session.add(Aircraft(aircraft_id="N12345", make="Cessna"))
    db_session.add(Flight(aircraft_id="N12345", date="2025-01-01", from_="KSBA", to="KSBA"))
    db_session.commit()
    assert db_session.query(Flight).count() == 1


def make_client(tmp_path, monkeypatch):
    monkeypatch.setenv("LOGBOOK_DB_PATH", str(tmp_path / "logbook.db"))
    import app.config as config

    reload(config)
    import app.db as db

    reload(db)
    import app.models as models

    reload(models)
    import app.main as main

    reload(main)
    return TestClient(main.create_app())


def test_flight_crud(tmp_path, monkeypatch):
    client = make_client(tmp_path, monkeypatch)
    r = client.post(
        "/api/flights",
        json={"date": "2025-01-01", "from_": "KSBA", "to": "KIZA", "total_time": "1.0"},
    )
    assert r.status_code == 201
    fid = r.json()["id"]
    assert client.get("/api/flights").json()["total"] >= 1
    assert client.get(f"/api/flights/{fid}").json()["to"] == "KIZA"
    client.patch(f"/api/flights/{fid}", json={"to": "KSMX"})
    assert client.get(f"/api/flights/{fid}").json()["to"] == "KSMX"
    assert client.delete(f"/api/flights/{fid}").status_code == 204


def test_aircraft_crud(tmp_path, monkeypatch):
    client = make_client(tmp_path, monkeypatch)
    r = client.post("/api/aircraft", json={"aircraft_id": "N12345", "make": "Cessna", "model": "172"})
    assert r.status_code == 201
    assert client.get("/api/aircraft").json()[0]["aircraft_id"] == "N12345"
    client.patch("/api/aircraft/N12345", json={"model": "172N"})
    assert client.get("/api/aircraft/N12345").json()["model"] == "172N"
    assert client.delete("/api/aircraft/N12345").status_code == 204


def test_import_then_export(tmp_path, monkeypatch, sample_csv_path):
    client = make_client(tmp_path, monkeypatch)
    files = {"file": ("logbook.csv", sample_csv_path.read_bytes(), "text/csv")}
    r = client.post("/api/import", files=files)
    assert r.status_code == 200
    assert r.json()["flight_count"] > 100
    r2 = client.post("/api/import", files=files)
    assert r2.json()["flight_count"] == 0
    exp = client.get("/api/export")
    assert exp.status_code == 200
    assert "Flights Table" in exp.text


def test_stats(tmp_path, monkeypatch, sample_csv_path):
    client = make_client(tmp_path, monkeypatch)
    client.post("/api/import", files={"file": ("l.csv", sample_csv_path.read_bytes(), "text/csv")})
    s = client.get("/api/stats").json()
    assert s["total_flights"] > 100
    assert s["total_time"] > 0
    assert "by_year" in s
