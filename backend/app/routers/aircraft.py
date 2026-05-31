from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_session
from app.models import Aircraft
from app.schemas import AircraftIn, AircraftOut

router = APIRouter(prefix="/api/aircraft", tags=["aircraft"])


@router.get("", response_model=list[AircraftOut])
def list_aircraft(db: Session = Depends(get_session)):
    return list(db.scalars(select(Aircraft).order_by(Aircraft.aircraft_id)))


@router.post("", status_code=201, response_model=AircraftOut)
def create_aircraft(payload: AircraftIn, db: Session = Depends(get_session)):
    db.merge(Aircraft(**payload.model_dump()))
    db.commit()
    return db.get(Aircraft, payload.aircraft_id)


@router.get("/{aircraft_id}", response_model=AircraftOut)
def get_aircraft(aircraft_id: str, db: Session = Depends(get_session)):
    a = db.get(Aircraft, aircraft_id)
    if not a:
        raise HTTPException(404)
    return a


@router.patch("/{aircraft_id}", response_model=AircraftOut)
def update_aircraft(aircraft_id: str, payload: dict, db: Session = Depends(get_session)):
    a = db.get(Aircraft, aircraft_id)
    if not a:
        raise HTTPException(404)
    for k, v in payload.items():
        if hasattr(a, k) and k != "aircraft_id":
            setattr(a, k, v)
    db.commit()
    db.refresh(a)
    return a


@router.delete("/{aircraft_id}", status_code=204)
def delete_aircraft(aircraft_id: str, db: Session = Depends(get_session)):
    a = db.get(Aircraft, aircraft_id)
    if not a:
        raise HTTPException(404)
    db.delete(a)
    db.commit()
