from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.coords.journey import build_journey
from app.coords.resolver import resolve_idents
from app.db import get_session
from app.models import FLIGHT_TEXT_FIELDS, Flight

router = APIRouter(prefix="/api", tags=["journey"])


@router.get("/journey")
def journey(db: Session = Depends(get_session)):
    flights = [
        {name: getattr(f, name) for name in FLIGHT_TEXT_FIELDS}
        for f in db.scalars(select(Flight))
    ]
    return build_journey(flights, lambda idents: resolve_idents(db, idents))
