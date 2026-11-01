import { describe, expect, it } from "vitest";
import { gridOffset, robustSpread, stdDev } from "../src/audio/onset";

describe("timing helpers", () => {
  it("measures early and late against a grid", () => {
    expect(gridOffset(1010, 0, 500)).toBe(10);
    expect(gridOffset(1480, 0, 500)).toBe(-20);
  });
  it("std dev", () => {
    expect(stdDev([10, 10, 10])).toBe(0);
    expect(stdDev([0, 20])).toBeCloseTo(14.142, 2);
  });
});

describe("robustSpread", () => {
  it("ignores a stray detection far from the beat", () => {
    const offsets = [80, 85, 75, 82, 78, 80, 300, 79];
    const r = robustSpread(offsets, 120);
    expect(r.strays).toBe(1);
    expect(r.spread).toBeLessThan(5);
  });
});
