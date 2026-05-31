import { describe, it, expect } from "vitest";
import { parseForeflightCsv } from "./foreflightCsv";

const CSV = `ForeFlight Logbook Import,This row is required for importing into ForeFlight. Do not delete or modify.,,
,,,
Aircraft Table,,,
AircraftID,TypeCode,Make,Model
N12345,C172,Cessna,172
,,,
Flights Table,,,
Date,AircraftID,From,To,Route,TotalTime,PilotComments,AllLandings
2025-06-27,N12345,KSBA,KMYF,SLI OCN VPSMS,1.6,"crosswind landing, one go around",1
2023-07-01,N12345,KSBA,KSBP,,1.5,,1
`;

describe("client-side ForeFlight CSV parser", () => {
  it("parses both tables", () => {
    const r = parseForeflightCsv(CSV);
    expect(r.aircraft).toHaveLength(1);
    expect(r.aircraft[0].aircraft_id).toBe("N12345");
    expect(r.flights).toHaveLength(2);
  });

  it("keeps quoted remarks with commas and assigns ids", () => {
    const r = parseForeflightCsv(CSV);
    const f = r.flights.find((x) => x.route === "SLI OCN VPSMS")!;
    expect(f.from_).toBe("KSBA");
    expect(f.to).toBe("KMYF");
    expect(f.pilot_comments).toBe("crosswind landing, one go around");
    expect(typeof f.id).toBe("number");
  });
});
