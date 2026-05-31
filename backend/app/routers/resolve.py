from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.coords.datasets import refresh_waypoints
from app.coords.resolver import resolve_idents
from app.db import get_session

router = APIRouter(prefix="/api", tags=["coords"])


@router.get("/resolve")
def resolve(idents: str = Query(...), db: Session = Depends(get_session)):
    return resolve_idents(db, idents.split(","))


@router.post("/datasets/refresh")
def refresh(db: Session = Depends(get_session)):
    return refresh_waypoints(db)
