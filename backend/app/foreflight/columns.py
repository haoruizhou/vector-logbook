"""Canonical ForeFlight CSV header strings and header<->field maps.

Derived from a real ForeFlight export (see sample/logbook.csv): row 4 is the
aircraft header, row 25 is the flights header.
"""

AIRCRAFT_HEADERS = [
    "AircraftID", "TypeCode", "Year", "Make", "Model", "GearType", "EngineType",
    "equipType (FAA)", "aircraftClass (FAA)", "complexAircraft (FAA)", "taa (FAA)",
    "highPerformance (FAA)", "pressurized (FAA)",
]
AIRCRAFT_HEADER_TO_FIELD = {
    "AircraftID": "aircraft_id", "TypeCode": "type_code", "Year": "year",
    "Make": "make", "Model": "model", "GearType": "gear_type",
    "EngineType": "engine_type", "equipType (FAA)": "equip_type",
    "aircraftClass (FAA)": "aircraft_class", "complexAircraft (FAA)": "complex",
    "taa (FAA)": "taa", "highPerformance (FAA)": "high_performance",
    "pressurized (FAA)": "pressurized",
}

FLIGHT_HEADERS = [
    "Date", "AircraftID", "From", "To", "Route", "TimeOut", "TimeOff", "TimeOn",
    "TimeIn", "OnDuty", "OffDuty", "TotalTime", "PIC", "SIC", "Night", "Solo",
    "CrossCountry", "PICUS", "MultiPilot", "IFR", "Examiner", "NVG", "NVG Ops",
    "Distance", "ActualInstrument", "SimulatedInstrument", "HobbsStart", "HobbsEnd",
    "TachStart", "TachEnd", "Holds", "Approach1", "Approach2", "Approach3",
    "Approach4", "Approach5", "Approach6", "DualGiven", "DualReceived",
    "SimulatedFlight", "GroundTraining", "GroundTrainingGiven", "InstructorName",
    "InstructorComments", "Person1", "Person2", "Person3", "Person4", "Person5",
    "Person6", "PilotComments", "Flight Review (FAA)", "IPC (FAA)",
    "Checkride (FAA)", "FAA 61.58 (FAA)", "NVG Proficiency (FAA)", "DayTakeoffs",
    "DayLandingsFullStop", "NightTakeoffs", "NightLandingsFullStop", "AllLandings",
]
FLIGHT_HEADER_TO_FIELD = {
    "Date": "date", "AircraftID": "aircraft_id", "From": "from_", "To": "to",
    "Route": "route", "TimeOut": "time_out", "TimeOff": "time_off",
    "TimeOn": "time_on", "TimeIn": "time_in", "OnDuty": "on_duty",
    "OffDuty": "off_duty", "TotalTime": "total_time", "PIC": "pic", "SIC": "sic",
    "Night": "night", "Solo": "solo", "CrossCountry": "cross_country",
    "PICUS": "picus", "MultiPilot": "multi_pilot", "IFR": "ifr",
    "Examiner": "examiner", "NVG": "nvg", "NVG Ops": "nvg_ops",
    "Distance": "distance", "ActualInstrument": "actual_instrument",
    "SimulatedInstrument": "simulated_instrument", "HobbsStart": "hobbs_start",
    "HobbsEnd": "hobbs_end", "TachStart": "tach_start", "TachEnd": "tach_end",
    "Holds": "holds", "Approach1": "approach1", "Approach2": "approach2",
    "Approach3": "approach3", "Approach4": "approach4", "Approach5": "approach5",
    "Approach6": "approach6", "DualGiven": "dual_given",
    "DualReceived": "dual_received", "SimulatedFlight": "simulated_flight",
    "GroundTraining": "ground_training", "GroundTrainingGiven": "ground_training_given",
    "InstructorName": "instructor_name", "InstructorComments": "instructor_comments",
    "Person1": "person1", "Person2": "person2", "Person3": "person3",
    "Person4": "person4", "Person5": "person5", "Person6": "person6",
    "PilotComments": "pilot_comments", "Flight Review (FAA)": "flight_review",
    "IPC (FAA)": "ipc", "Checkride (FAA)": "checkride", "FAA 61.58 (FAA)": "faa_6158",
    "NVG Proficiency (FAA)": "nvg_proficiency", "DayTakeoffs": "day_takeoffs",
    "DayLandingsFullStop": "day_landings_full_stop", "NightTakeoffs": "night_takeoffs",
    "NightLandingsFullStop": "night_landings_full_stop", "AllLandings": "all_landings",
}

# Inverse maps (field -> header string) for export.
AIRCRAFT_FIELD_TO_HEADER = {v: k for k, v in AIRCRAFT_HEADER_TO_FIELD.items()}
FLIGHT_FIELD_TO_HEADER = {v: k for k, v in FLIGHT_HEADER_TO_FIELD.items()}
