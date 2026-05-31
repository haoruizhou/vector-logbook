from fastapi import APIRouter, Depends, File, UploadFile
from fastapi.responses import PlainTextResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_session
from app.foreflight.exporter import build_foreflight_csv
from app.foreflight.importer import parse_foreflight_csv
from app.models import FLIGHT_TEXT_FIELDS, Aircraft, Flight, ImportLog

router = APIRouter(prefix="/api", tags=["io"])

_DEDUPE_KEYS = ("date", "aircraft_id", "from_", "to", "route", "total_time")


def _key(d: dict) -> tuple:
    return tuple(d.get(k) for k in _DEDUPE_KEYS)


@router.post("/import")
async def import_csv(file: UploadFile = File(...), db: Session = Depends(get_session)):
    text = (await file.read()).decode("utf-8-sig")
    parsed = parse_foreflight_csv(text)

    aircraft_cols = {c.name for c in Aircraft.__table__.columns}
    # ForeFlight exports can contain duplicate AircraftID rows; last one wins.
    deduped: dict[str, dict] = {}
    for a in parsed.aircraft:
        deduped[a["aircraft_id"]] = {k: v for k, v in a.items() if k in aircraft_cols}
    for fields in deduped.values():
        db.merge(Aircraft(**fields))
    db.commit()

    existing = {
        _key({n: getattr(f, n) for n in FLIGHT_TEXT_FIELDS}) for f in db.scalars(select(Flight))
    }
    added = 0
    for fl in parsed.flights:
        if _key(fl) in existing:
            continue
        db.add(Flight(**{k: v for k, v in fl.items() if k in FLIGHT_TEXT_FIELDS}))
        existing.add(_key(fl))
        added += 1

    db.add(
        ImportLog(
            filename=file.filename,
            aircraft_count=len(parsed.aircraft),
            flight_count=added,
            skipped_count=parsed.skipped,
        )
    )
    db.commit()
    return {
        "aircraft_count": len(parsed.aircraft),
        "flight_count": added,
        "skipped_count": parsed.skipped,
    }


@router.get("/export", response_class=PlainTextResponse)
def export_csv(db: Session = Depends(get_session)):
    aircraft = [
        {c.name: getattr(a, c.name) for c in a.__table__.columns}
        for a in db.scalars(select(Aircraft).order_by(Aircraft.aircraft_id))
    ]
    flights = [
        {n: getattr(f, n) for n in FLIGHT_TEXT_FIELDS}
        for f in db.scalars(select(Flight).order_by(Flight.date))
    ]
    csv_text = build_foreflight_csv(aircraft, flights)
    return PlainTextResponse(
        csv_text,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=logbook.csv"},
    )
