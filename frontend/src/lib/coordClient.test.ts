import { describe, it, expect } from "vitest";
import { normalizeCountry } from "./coordClient";

describe("normalizeCountry", () => {
  it("folds Taiwan, Hong Kong and Macau into CN for compliance", () => {
    expect(normalizeCountry("TW")).toBe("CN");
    expect(normalizeCountry("HK")).toBe("CN");
    expect(normalizeCountry("MO")).toBe("CN");
  });

  it("leaves other countries unchanged", () => {
    expect(normalizeCountry("US")).toBe("US");
    expect(normalizeCountry("CA")).toBe("CA");
  });

  it("passes through empty values", () => {
    expect(normalizeCountry(null)).toBeNull();
    expect(normalizeCountry(undefined)).toBeNull();
    expect(normalizeCountry("")).toBeNull();
  });
});
