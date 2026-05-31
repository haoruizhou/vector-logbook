import { describe, it, expect } from "vitest";
import { parsePerson, routeIdents, cleanText, num } from "./foreflight";

describe("foreflight helpers", () => {
  it("parses a person string", () => {
    expect(parsePerson("Jake Tous;Instructor;;")?.role).toBe("Instructor");
    expect(parsePerson("")).toBeNull();
  });

  it("builds route idents with a route", () => {
    expect(routeIdents({ from_: "KEMT", to: "KMYF", route: "SLI OCN" })).toEqual([
      "KEMT",
      "SLI",
      "OCN",
      "KMYF",
    ]);
  });

  it("builds route idents without a route", () => {
    expect(routeIdents({ from_: "KSBA", to: "KIZA", route: "" })).toEqual(["KSBA", "KIZA"]);
  });

  it("strips ForeFlight quote wrapping", () => {
    expect(cleanText('"crosswind landing, go around"')).toBe("crosswind landing, go around");
  });

  it("parses numbers safely", () => {
    expect(num("1.6")).toBe(1.6);
    expect(num(null)).toBe(0);
    expect(num("")).toBe(0);
  });
});
