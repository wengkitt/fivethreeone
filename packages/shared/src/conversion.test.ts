import { describe, it, expect } from "vitest";
import { kgToLb, lbToKg, convertWeight } from "./conversion.js";

describe("kgToLb", () => {
  it("converts kilograms to pounds", () => {
    expect(kgToLb(100)).toBeCloseTo(220.462, 2);
  });

  it("returns 0 for 0 kg", () => {
    expect(kgToLb(0)).toBe(0);
  });
});

describe("lbToKg", () => {
  it("converts pounds to kilograms", () => {
    expect(lbToKg(220.462)).toBeCloseTo(100, 1);
  });
});

describe("convertWeight", () => {
  it("returns the same value when units match", () => {
    expect(convertWeight(100, "kg", "kg")).toBe(100);
    expect(convertWeight(150, "lb", "lb")).toBe(150);
  });

  it("converts between kg and lb", () => {
    expect(convertWeight(100, "kg", "lb")).toBeCloseTo(220.462, 2);
    expect(convertWeight(220.462, "lb", "kg")).toBeCloseTo(100, 1);
  });
});
