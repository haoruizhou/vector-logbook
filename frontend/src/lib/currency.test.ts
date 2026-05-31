import { describe, it, expect } from "vitest";
import { computeCurrency } from "./currency";
import type { Flight } from "../types";

function flight(p: Partial<Flight>): Flight {
  return { id: Math.random(), ...p } as Flight;
}

const ASOF = Date.parse("2026-01-15");

describe("FAA currency", () => {
  it("is current when 3 takeoffs/landings within 90 days", () => {
    const flights = [
      flight({ date: "2026-01-10", day_takeoffs: "3", all_landings: "3" }),
    ];
    const items = computeCurrency(flights, "FAA", ASOF);
    const day = items.find((i) => i.title === "Day Passenger")!;
    expect(day.status).toBe("current");
    expect(day.expires).toBe("2026-04-10");
  });

  it("is expired when last landings are over 90 days old", () => {
    const flights = [flight({ date: "2025-09-01", day_takeoffs: "3", all_landings: "3" })];
    const items = computeCurrency(flights, "FAA", ASOF);
    expect(items.find((i) => i.title === "Day Passenger")!.status).toBe("expired");
  });

  it("flight review valid through end of the 24th calendar month", () => {
    const flights = [flight({ date: "2025-02-15", checkride: "TRUE" })];
    const fr = computeCurrency(flights, "FAA", ASOF).find((i) => i.title === "Flight Review")!;
    expect(fr.status).toBe("current");
    expect(fr.expires).toBe("2027-02-28"); // calendar-month: through month-end
  });

  it("flight review from May 2024 expires end of May 2026", () => {
    const flights = [flight({ date: "2024-05-29", checkride: "TRUE" })];
    // as of 2026-05-30, it is in its final days but still current
    const fr = computeCurrency(flights, "FAA", Date.parse("2026-05-30")).find(
      (i) => i.title === "Flight Review",
    )!;
    expect(fr.expires).toBe("2026-05-31");
    expect(fr.status).toBe("expiring");
  });

  it("IFR recency needs 6 approaches in 6 months", () => {
    const flights = [
      flight({ date: "2026-01-05", approach1: "ILS", approach2: "RNAV", approach3: "VOR" }),
      flight({ date: "2025-12-20", approach1: "ILS", approach2: "RNAV", approach3: "LOC" }),
    ];
    const ifr = computeCurrency(flights, "FAA", ASOF).find((i) => i.title === "IFR Recency")!;
    expect(ifr.status).toBe("current");
  });
});

describe("Canada currency", () => {
  it("passenger carrying needs 5 takeoffs/landings in 6 months", () => {
    const flights = [flight({ date: "2026-01-10", day_takeoffs: "5", all_landings: "5" })];
    const pax = computeCurrency(flights, "CANADA", ASOF).find((i) => i.title === "Passenger Carrying")!;
    expect(pax.status).toBe("current");
  });

  it("5-year recency expires 60 months after last flight", () => {
    const flights = [flight({ date: "2025-06-01", all_landings: "1" })];
    const rec = computeCurrency(flights, "CANADA", ASOF).find((i) => i.title === "5-Year Recency")!;
    expect(rec.status).toBe("current");
    expect(rec.expires).toBe("2030-06-01");
  });
});
