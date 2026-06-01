from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.db import init_db

_STATIC = Path(__file__).parent / "static"  # SPA build is copied here in Docker


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        from app.scheduler import start_scheduler

        sched = start_scheduler()
    except Exception:
        sched = None
    yield
    if sched is not None:
        sched.shutdown(wait=False)


def create_app() -> FastAPI:
    app = FastAPI(title="Flight Logbook", lifespan=lifespan)
    init_db()

    from app.routers import aircraft, flights, io as io_router, journey, resolve, stats

    for r in (
        flights.router,
        aircraft.router,
        io_router.router,
        resolve.router,
        stats.router,
        journey.router,
    ):
        app.include_router(r)

    if _STATIC.exists():
        app.mount("/", StaticFiles(directory=_STATIC, html=True), name="spa")
    return app


app = create_app()
