import { describe, it, expect } from "vitest";
import { gcDistanceNm, gcInterpolate } from "./geo";

describe("geo", () => {
  it("KSBA->KLAX is roughly 76 nm", () => {
    const d = gcDistanceNm(34.4262, -119.8404, 33.9425, -118.4081);
    expect(d).toBeGreaterThan(70);
    expect(d).toBeLessThan(82);
  });

  it("interpolates inclusive of endpoints", () => {
    const p = gcInterpolate(0, 0, 0, 10, 4);
    expect(p.length).toBe(5);
    expect(p[0]).toEqual([0, 0]);
  });
});
