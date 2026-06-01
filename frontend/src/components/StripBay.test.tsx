import "@testing-library/jest-dom";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import StripBay from "./StripBay";
import type { Journey } from "../types";

const journey: Journey = {
  airports: [
    { ident: "KSBA", name: "Santa Barbara", country: "US", lat: 34.4, lon: -119.8, visits: 3, first_date: "2021-01-01", last_date: "2023-01-01" },
    { ident: "KMYF", name: "Montgomery", country: "US", lat: 32.8, lon: -117.1, visits: 1, first_date: "2022-01-01", last_date: "2022-01-01" },
  ],
  legs: [
    { from_ident: "KSBA", to_ident: "KMYF", from_lat: 34.4, from_lon: -119.8, to_lat: 32.8, to_lon: -117.1, count: 2, last_date: "2023-01-01" },
  ],
  identity: { callsign: "N1", first_flight_year: "2021", home_base: "KSBA", total_hours: 5, airport_count: 2, country_count: 1, aircraft_count: 1, people_count: 0, night_hours: 0, longest_leg_nm: 76, furthest_from_home_nm: 76 },
  milestones: [],
};

describe("StripBay", () => {
  it("shows airports by default, most-visited first", () => {
    render(<StripBay journey={journey} selected={null} onSelect={() => {}} />);
    const strips = screen.getAllByRole("button").filter((b) => b.className.includes("atc-strip"));
    expect(strips[0]).toHaveTextContent("KSBA");
  });

  it("toggles to flights view", () => {
    render(<StripBay journey={journey} selected={null} onSelect={() => {}} />);
    fireEvent.click(screen.getByRole("tab", { name: /Flights/ }));
    expect(screen.getByText("KSBA→KMYF")).toBeInTheDocument();
  });

  it("emits selection on hover", () => {
    const onSelect = vi.fn();
    render(<StripBay journey={journey} selected={null} onSelect={onSelect} />);
    const strip = screen.getByText("KSBA").closest("button")!;
    fireEvent.mouseEnter(strip);
    expect(onSelect).toHaveBeenCalledWith("KSBA");
  });
});
