from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_session
from app.models import Flight

router = APIRouter(prefix="/api", tags=["stats"])

_SUM_FIELDS = [
    "total_time", "pic", "sic", "night", "cross_country",
    "actual_instrument", "simulated_instrument",
]


def _f(v) -> float:
    try:
        return float(v)
    except (TypeError, ValueError):
        return 0.0


@router.get("/stats")
def stats(db: Session = Depends(get_session)):
    flights = list(db.scalars(select(Flight)))
    totals = {k: round(sum(_f(getattr(f, k)) for f in flights), 1) for k in _SUM_FIELDS}
    by_year: dict[str, float] = {}
    by_type: dict[str, float] = {}
    landings = 0
    for f in flights:
        yr = (f.date or "")[:4]
        by_year[yr] = round(by_year.get(yr, 0.0) + _f(f.total_time), 1)
        key = f.aircraft_id or "—"
        by_type[key] = round(by_type.get(key, 0.0) + _f(f.total_time), 1)
        landings += int(_f(f.all_landings))
    return {
        "total_flights": len(flights),
        "total_landings": landings,
        "by_year": dict(sorted(by_year.items())),
        "by_aircraft": dict(sorted(by_type.items(), key=lambda kv: -kv[1])),
        **totals,
        **{f"total_{k}": v for k, v in totals.items()},
    }
