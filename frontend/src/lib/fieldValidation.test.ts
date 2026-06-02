import { describe, it, expect } from "vitest";
import { validateField } from "./fieldValidation";

describe("validateField", () => {
  it("treats empty as valid for any type", () => {
    expect(validateField("time", "")).toBeNull();
    expect(validateField("num", "   ")).toBeNull();
  });

  it("accepts 24-hour hh:mm and rejects anything else", () => {
    expect(validateField("time", "13:45")).toBeNull();
    expect(validateField("time", "00:00")).toBeNull();
    expect(validateField("time", "23:59")).toBeNull();
    expect(validateField("time", "24:00")).not.toBeNull();
    expect(validateField("time", "9:5")).not.toBeNull();
    expect(validateField("time", "13:60")).not.toBeNull();
    expect(validateField("time", "1.5")).not.toBeNull();
  });

  it("accepts non-negative decimals for num and rejects the rest", () => {
    expect(validateField("num", "1.5")).toBeNull();
    expect(validateField("num", "0")).toBeNull();
    expect(validateField("num", "12")).toBeNull();
    expect(validateField("num", "-1")).not.toBeNull();
    expect(validateField("num", "abc")).not.toBeNull();
  });

  it("ignores text/date/bool fields", () => {
    expect(validateField("text", "KSBA")).toBeNull();
    expect(validateField("date", "2024-01-01")).toBeNull();
  });
});
