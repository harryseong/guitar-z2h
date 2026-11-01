import { describe, expect, it } from "vitest";
import { detectPitch } from "../src/audio/pitch";
import { STANDARD_TUNING, midiToFreq, noteFromFreq, nearestString } from "../src/music/notes";
import { pluck } from "./synth";

const SR = 48000;

describe("detectPitch", () => {
  it("returns null for silence", () => {
    expect(detectPitch(new Float32Array(4096), SR)).toBeNull();
  });

  it("finds a pure sine within 1 cent", () => {
    const f = 196;
    const buf = Float32Array.from({ length: 4096 }, (_, i) => 0.5 * Math.sin((2 * Math.PI * f * i) / SR));
    const r = detectPitch(buf, SR)!;
    expect(Math.abs(1200 * Math.log2(r.freq / f))).toBeLessThan(1);
  });

  for (const s of STANDARD_TUNING) {
    it(`detects open string ${s.label} without octave errors`, () => {
      const buf = pluck([s.midi], { sampleRate: SR, length: 4096, detuneCents: 0, seed: s.midi });
      const r = detectPitch(buf, SR)!;
      expect(r).not.toBeNull();
      const n = noteFromFreq(r.freq);
      expect(n.midi).toBe(s.midi);
      expect(Math.abs(n.cents)).toBeLessThan(5);
    });
  }

  it("picks the nearest string and signed cents", () => {
    const flatA = midiToFreq(45 - 0.2); // A2, 20 cents flat
    const { index, cents } = nearestString(flatA);
    expect(STANDARD_TUNING[index].label).toBe("A2");
    expect(cents).toBeCloseTo(-20, 5);
  });
});
