import { describe, expect, it } from "vitest";
import { OnsetDetector, gridOffset, stdDev } from "../src/audio/onset";

describe("OnsetDetector", () => {
  it("fires once per strum and ignores the decay", () => {
    const d = new OnsetDetector();
    const hits: number[] = [];
    // 10ms frames: quiet, strum at 100ms decaying, strum at 600ms.
    for (let t = 0; t < 1000; t += 10) {
      const env = (s: number) => (t >= s ? 0.3 * Math.exp(-(t - s) / 150) : 0);
      const level = 0.003 + env(100) + env(600);
      if (d.push(level, t)) hits.push(t);
    }
    expect(hits).toEqual([100, 600]);
  });
});

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
