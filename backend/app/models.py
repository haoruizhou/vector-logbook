from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base

# Flight columns in ForeFlight CSV order. Single source of truth for the
# importer, exporter, schemas, stats, and the frontend type. Stored as text to
# preserve original formatting ("1.0" vs "1"); the UI parses for math.
FLIGHT_TEXT_FIELDS = [
    "date", "aircraft_id", "from_", "to", "route",
    "time_out", "time_off", "time_on", "time_in", "on_duty", "off_duty",
    "total_time", "pic", "sic", "night", "solo", "cross_country", "picus",
    "multi_pilot", "ifr", "examiner", "nvg", "nvg_ops", "distance",
    "actual_instrument", "simulated_instrument", "hobbs_start", "hobbs_end",
    "tach_start", "tach_end", "holds",
    "approach1", "approach2", "approach3", "approach4", "approach5", "approach6",
    "dual_given", "dual_received", "simulated_flight", "ground_training",
    "ground_training_given", "instructor_name", "instructor_comments",
    "person1", "person2", "person3", "person4", "person5", "person6",
    "pilot_comments", "flight_review", "ipc", "checkride", "faa_6158",
    "nvg_proficiency", "day_takeoffs", "day_landings_full_stop",
    "night_takeoffs", "night_landings_full_stop", "all_landings",
]


class Aircraft(Base):
    __tablename__ = "aircraft"

    aircraft_id: Mapped[str] = mapped_column(String, primary_key=True)
    type_code: Mapped[str | None] = mapped_column(String)
    year: Mapped[str | None] = mapped_column(String)
    make: Mapped[str | None] = mapped_column(String)
    model: Mapped[str | None] = mapped_column(String)
    gear_type: Mapped[str | None] = mapped_column(String)
    engine_type: Mapped[str | None] = mapped_column(String)
    equip_type: Mapped[str | None] = mapped_column(String)
    aircraft_class: Mapped[str | None] = mapped_column(String)
    complex: Mapped[str | None] = mapped_column(String)
    taa: Mapped[str | None] = mapped_column(String)
    high_performance: Mapped[str | None] = mapped_column(String)
    pressurized: Mapped[str | None] = mapped_column(String)


class Flight(Base):
    __tablename__ = "flights"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    date: Mapped[str | None] = mapped_column(String)
    aircraft_id: Mapped[str | None] = mapped_column(ForeignKey("aircraft.aircraft_id"))
    from_: Mapped[str | None] = mapped_column(String)
    to: Mapped[str | None] = mapped_column(String)
    route: Mapped[str | None] = mapped_column(String)
    time_out: Mapped[str | None] = mapped_column(String)
    time_off: Mapped[str | None] = mapped_column(String)
    time_on: Mapped[str | None] = mapped_column(String)
    time_in: Mapped[str | None] = mapped_column(String)
    on_duty: Mapped[str | None] = mapped_column(String)
    off_duty: Mapped[str | None] = mapped_column(String)
    total_time: Mapped[str | None] = mapped_column(String)
    pic: Mapped[str | None] = mapped_column(String)
    sic: Mapped[str | None] = mapped_column(String)
    night: Mapped[str | None] = mapped_column(String)
    solo: Mapped[str | None] = mapped_column(String)
    cross_country: Mapped[str | None] = mapped_column(String)
    picus: Mapped[str | None] = mapped_column(String)
    multi_pilot: Mapped[str | None] = mapped_column(String)
    ifr: Mapped[str | None] = mapped_column(String)
    examiner: Mapped[str | None] = mapped_column(String)
    nvg: Mapped[str | None] = mapped_column(String)
    nvg_ops: Mapped[str | None] = mapped_column(String)
    distance: Mapped[str | None] = mapped_column(String)
    actual_instrument: Mapped[str | None] = mapped_column(String)
    simulated_instrument: Mapped[str | None] = mapped_column(String)
    hobbs_start: Mapped[str | None] = mapped_column(String)
    hobbs_end: Mapped[str | None] = mapped_column(String)
    tach_start: Mapped[str | None] = mapped_column(String)
    tach_end: Mapped[str | None] = mapped_column(String)
    holds: Mapped[str | None] = mapped_column(String)
    approach1: Mapped[str | None] = mapped_column(String)
    approach2: Mapped[str | None] = mapped_column(String)
    approach3: Mapped[str | None] = mapped_column(String)
    approach4: Mapped[str | None] = mapped_column(String)
    approach5: Mapped[str | None] = mapped_column(String)
    approach6: Mapped[str | None] = mapped_column(String)
    dual_given: Mapped[str | None] = mapped_column(String)
    dual_received: Mapped[str | None] = mapped_column(String)
    simulated_flight: Mapped[str | None] = mapped_column(String)
    ground_training: Mapped[str | None] = mapped_column(String)
    ground_training_given: Mapped[str | None] = mapped_column(String)
    instructor_name: Mapped[str | None] = mapped_column(String)
    instructor_comments: Mapped[str | None] = mapped_column(String)
    person1: Mapped[str | None] = mapped_column(String)
    person2: Mapped[str | None] = mapped_column(String)
    person3: Mapped[str | None] = mapped_column(String)
    person4: Mapped[str | None] = mapped_column(String)
    person5: Mapped[str | None] = mapped_column(String)
    person6: Mapped[str | None] = mapped_column(String)
    pilot_comments: Mapped[str | None] = mapped_column(String)
    flight_review: Mapped[str | None] = mapped_column(String)
    ipc: Mapped[str | None] = mapped_column(String)
    checkride: Mapped[str | None] = mapped_column(String)
    faa_6158: Mapped[str | None] = mapped_column(String)
    nvg_proficiency: Mapped[str | None] = mapped_column(String)
    day_takeoffs: Mapped[str | None] = mapped_column(String)
    day_landings_full_stop: Mapped[str | None] = mapped_column(String)
    night_takeoffs: Mapped[str | None] = mapped_column(String)
    night_landings_full_stop: Mapped[str | None] = mapped_column(String)
    all_landings: Mapped[str | None] = mapped_column(String)


# Fail fast if the model and the source-of-truth field list drift apart.
_flight_cols = {c.name for c in Flight.__table__.columns} - {"id"}
assert _flight_cols == set(FLIGHT_TEXT_FIELDS), (
    f"Flight model columns out of sync with FLIGHT_TEXT_FIELDS: "
    f"{_flight_cols ^ set(FLIGHT_TEXT_FIELDS)}"
)


class Waypoint(Base):
    __tablename__ = "waypoints"

    # Identifiers collide globally (e.g. "SLI" is a VOR in California and an NDB
    # in Colombia), so we store every candidate and disambiguate by proximity at
    # resolve time. Primary key is a surrogate id; ident is indexed, not unique.
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ident: Mapped[str] = mapped_column(String, index=True)
    type: Mapped[str] = mapped_column(String)
    lat: Mapped[float] = mapped_column(Float)
    lon: Mapped[float] = mapped_column(Float)
    name: Mapped[str | None] = mapped_column(String)
    country: Mapped[str | None] = mapped_column(String)
    source: Mapped[str | None] = mapped_column(String)
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class ImportLog(Base):
    __tablename__ = "import_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    filename: Mapped[str | None] = mapped_column(String)
    imported_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    aircraft_count: Mapped[int] = mapped_column(Integer, default=0)
    flight_count: Mapped[int] = mapped_column(Integer, default=0)
    skipped_count: Mapped[int] = mapped_column(Integer, default=0)
