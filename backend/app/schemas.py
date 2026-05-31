from pydantic import BaseModel, ConfigDict, create_model

from app.models import FLIGHT_TEXT_FIELDS


class AircraftIn(BaseModel):
    aircraft_id: str
    type_code: str | None = None
    year: str | None = None
    make: str | None = None
    model: str | None = None
    gear_type: str | None = None
    engine_type: str | None = None
    equip_type: str | None = None
    aircraft_class: str | None = None
    complex: str | None = None
    taa: str | None = None
    high_performance: str | None = None
    pressurized: str | None = None


class AircraftOut(AircraftIn):
    model_config = ConfigDict(from_attributes=True)


# FlightIn is generated from the single source of truth so it never drifts.
FlightIn = create_model(
    "FlightIn",
    **{name: (str | None, None) for name in FLIGHT_TEXT_FIELDS},
)
