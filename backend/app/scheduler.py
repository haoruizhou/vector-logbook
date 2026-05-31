import threading

from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy import func, select

from app.config import settings
from app.coords.datasets import refresh_waypoints
from app.db import SessionLocal


def _refresh_job() -> None:
    db = SessionLocal()
    try:
        refresh_waypoints(db)
    finally:
        db.close()


def _seed_if_empty() -> None:
    """Populate the waypoint cache on first boot (network, or bundled fallback)."""
    db = SessionLocal()
    try:
        from app.models import Waypoint

        count = db.scalar(select(func.count()).select_from(Waypoint))
        if not count:
            refresh_waypoints(db)
    finally:
        db.close()


def start_scheduler() -> BackgroundScheduler:
    # Seed in a background thread so an empty cache doesn't block startup.
    threading.Thread(target=_seed_if_empty, daemon=True).start()

    sched = BackgroundScheduler()
    sched.add_job(_refresh_job, "interval", days=settings.refresh_interval_days, id="refresh")
    sched.start()
    return sched
