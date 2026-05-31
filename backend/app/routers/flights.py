from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.db import get_session
from app.models import FLIGHT_TEXT_FIELDS, Flight
from app.schemas import FlightIn

router = APIRouter(prefix="/api/flights", tags=["flights"])


def _to_dict(f: Flight) -> dict:
    d: dict = {"id": f.id}
    for name in FLIGHT_TEXT_FIELDS:
        d[name] = getattr(f, name)
    return d


@router.get("")
def list_flights(
    db: Session = Depends(get_session),
    q: str | None = None,
    aircraft_id: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    sort: str = "date",
    order: str = "desc",
    limit: int = Query(100, le=1000),
    offset: int = 0,
):
    stmt = select(Flight)
    if aircraft_id:
        stmt = stmt.where(Flight.aircraft_id == aircraft_id)
    if date_from:
        stmt = stmt.where(Flight.date >= date_from)
    if date_to:
        stmt = stmt.where(Flight.date <= date_to)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(
            or_(
                Flight.from_.like(like),
                Flight.to.like(like),
                Flight.route.like(like),
                Flight.pilot_comments.like(like),
            )
        )
    total = db.scalar(select(func.count()).select_from(stmt.subquery()))
    col = getattr(Flight, sort, Flight.date)
    stmt = stmt.order_by(col.desc() if order == "desc" else col.asc()).limit(limit).offset(offset)
    items = [_to_dict(f) for f in db.scalars(stmt)]
    return {"total": total, "items": items}


@router.post("", status_code=201)
def create_flight(payload: FlightIn, db: Session = Depends(get_session)):
    f = Flight(**{k: v for k, v in payload.model_dump().items() if v is not None})
    db.add(f)
    db.commit()
    db.refresh(f)
    return _to_dict(f)


@router.get("/{flight_id}")
def get_flight(flight_id: int, db: Session = Depends(get_session)):
    f = db.get(Flight, flight_id)
    if not f:
        raise HTTPException(404)
    return _to_dict(f)


@router.patch("/{flight_id}")
def update_flight(flight_id: int, payload: dict, db: Session = Depends(get_session)):
    f = db.get(Flight, flight_id)
    if not f:
        raise HTTPException(404)
    for k, v in payload.items():
        if k in FLIGHT_TEXT_FIELDS:
            setattr(f, k, v)
    db.commit()
    db.refresh(f)
    return _to_dict(f)


@router.delete("/{flight_id}", status_code=204)
def delete_flight(flight_id: int, db: Session = Depends(get_session)):
    f = db.get(Flight, flight_id)
    if not f:
        raise HTTPException(404)
    db.delete(f)
    db.commit()
