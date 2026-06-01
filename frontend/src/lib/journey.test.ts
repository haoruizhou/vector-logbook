import { describe, it, expect } from "vitest";
import { buildJourney } from "./journey";
import type { Flight, ResolveResult, Waypoint } from "../types";

const WP: Record<string, Waypoint> = {
  KSBA: { ident: "KSBA", lat: 34.4262, lon: -119.8404, type: "airport", name: "Santa Barbara", country: "US" },
  KMYF: { ident: "KMYF", lat: 32.8157, lon: -117.14, type: "airport", name: "Montgomery", country: "US" },
  KSBP: { ident: "KSBP", lat: 35.2368, lon: -120.6424, type: "airport", name: "San Luis", country: "US" },
  CYYJ: { ident: "CYYJ", lat: 48.6469, lon: -123.4258, type: "airport", name: "Victoria", country: "CA" },
  SLI: { ident: "SLI", lat: 33.783, lon: -118.055, type: "vor", name: "Seal Beach", country: null },
};
const resolve = (idents: string[]): ResolveResult =>
  Object.fromEntries(idents.map((i) => [i, WP[i.trim().toUpperCase()] ?? null]));
const F = (p: Partial<Flight>): Flight => ({ id: 0, ...p }) as Flight;

describe("buildJourney", () => {
  it("counts airport visits and ignores non-airport fixes", () => {
    const j = buildJourney(
      [F({ date: "2022-01-01", from_: "KSBA", to: "KMYF", route: "SLI" }), F({ date: "2023-05-02", from_: "KMYF", to: "KSBA" })],
      resolve,
    );
    const by = Object.fromEntries(j.airports.map((a) => [a.ident, a]));
    expect(Object.keys(by).sort()).toEqual(["KMYF", "KSBA"]);
    expect(by.KSBA.visits).toBe(2);
    expect(by.KSBA.first_date).toBe("2022-01-01");
    expect(by.KSBA.last_date).toBe("2023-05-02");
  });

  it("dedups legs and counts them", () => {
    const j = buildJourney(
      [F({ date: "2022-01-01", from_: "KSBA", to: "KMYF" }), F({ date: "2022-02-01", from_: "KSBA", to: "KMYF" }), F({ date: "2022-03-01", from_: "KSBA", to: "KSBP" })],
      resolve,
    );
    const legs = Object.fromEntries(j.legs.map((l) => [`${l.from_ident}-${l.to_ident}`, l]));
    expect(legs["KSBA-KMYF"].count).toBe(2);
    expect(legs["KSBA-KMYF"].last_date).toBe("2022-02-01");
    expect(legs["KSBA-KSBP"].count).toBe(1);
  });

  it("derives identity fields", () => {
    const j = buildJourney(
      [
        F({ date: "2021-06-01", from_: "KSBA", to: "KMYF", aircraft_id: "N111", total_time: "1.5", night: "0.5", person1: "Alice;Passenger;;" }),
        F({ date: "2022-07-01", from_: "KSBA", to: "KMYF", aircraft_id: "N111", total_time: "2.0" }),
        F({ date: "2023-08-01", from_: "KSBA", to: "CYYJ", aircraft_id: "N222", total_time: "3.0", person1: "Bob" }),
      ],
      resolve,
    );
    expect(j.identity.callsign).toBe("N111");
    expect(j.identity.first_flight_year).toBe("2021");
    expect(j.identity.home_base).toBe("KSBA");
    expect(j.identity.total_hours).toBe(6.5);
    expect(j.identity.night_hours).toBe(0.5);
    expect(j.identity.airport_count).toBe(3);
    expect(j.identity.country_count).toBe(2);
    expect(j.identity.aircraft_count).toBe(2);
    expect(j.identity.people_count).toBe(2);
  });

  it("emits first_flight and first_international milestones", () => {
    const j = buildJourney(
      [F({ date: "2021-06-01", from_: "KSBA", to: "KMYF" }), F({ date: "2023-08-01", from_: "KSBA", to: "CYYJ" })],
      resolve,
    );
    const keys = Object.fromEntries(j.milestones.map((m) => [m.key, m]));
    expect(keys.first_flight.date).toBe("2021-06-01");
    expect(keys.first_international.date).toBe("2023-08-01");
  });

  it("counts a round-trip (from_ === to) as a single visit", () => {
    const j = buildJourney([F({ date: "2022-01-01", from_: "KSBA", to: "KSBA" })], resolve);
    const by = Object.fromEntries(j.airports.map((a) => [a.ident, a]));
    expect(by.KSBA.visits).toBe(1);
  });

  it("skips flights that don't resolve two points", () => {
    const j = buildJourney([F({ date: "2021-01-01", from_: "ZZZZ", to: "QQQQ" })], resolve);
    expect(j.airports).toEqual([]);
    expect(j.legs).toEqual([]);
    expect(j.identity.airport_count).toBe(0);
  });
});
