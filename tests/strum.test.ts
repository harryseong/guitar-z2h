import { describe, expect, it } from "vitest";
import { FluxOnsetDetector } from "../src/audio/onset";
import { findChord, shapeMidiNotes } from "../src/music/chords";
import { pluck } from "./synth";

const SR = 48000;
const HOP = 800; // ~17 ms, like a 60 fps animation frame

/** Strums of a chord at a steady tempo, each one landing while the last is still ringing. */
function strummed(chord: string, bpm: number, n: number, ring: number, eighths = false) {
  const step = 60 / bpm / (eighths ? 2 : 1);
  const len = Math.round(SR * step * (n + 2));
  const out = new Float32Array(len);
  const times: number[] = [];
  const notes = shapeMidiNotes(findChord(chord)!);
  // A few strum "recordings" reused with varying loudness keeps the test fast.
  // Each plucks the strings one after another (a strum takes ~30 ms across
  // six strings) and starts with a short burst of pick noise.
  const strumLen = Math.min(len, Math.round(SR * 4));
  const takes = [1, 2, 3, 4].map((seed) => {
    const t = new Float32Array(strumLen);
    notes.forEach((m, i) => {
      const s = pluck([m], { sampleRate: SR, length: strumLen, seed: seed * 10 + i, noise: 0, ring });
      const off = Math.round(SR * 0.006 * i);
      for (let j = 0; j + off < strumLen; j++) t[j + off] += s[j] / notes.length;
    });
    let r = seed;
    for (let j = 0; j < SR * 0.015; j++) {
      r = (r * 1664525 + 1013904223) >>> 0;
      t[j] += (r / 2 ** 32 - 0.5) * 0.15 * Math.exp(-j / (SR * 0.004));
    }
    return t;
  });
  for (let k = 0; k < n; k++) {
    const strum = takes[k % takes.length];
    // Upstrokes (off-beats) are softer, and nobody strums at exactly the same volume.
    const amp = (0.6 + 0.4 * (((k * 37) % 10) / 10)) * (eighths && k % 2 ? 0.5 : 1);
    const off = Math.round(SR * step * (k + 0.5));
    times.push((off / SR) * 1000);
    // Re-striking a string replaces its vibration rather than adding to it,
    // so the previous strum is damped over a few ms as the new one starts.
    // (Plain summing would make identical strums beat against each other.)
    const fade = Math.round(SR * 0.005);
    for (let i = off; i < len; i++) out[i] *= i - off < fade ? 1 - (i - off) / fade : 0;
    for (let i = 0; i < strum.length && off + i < len; i++) out[off + i] += strum[i] * amp;
  }
  let seed = 7;
  for (let i = 0; i < len; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    out[i] += (seed / 2 ** 32 - 0.5) * 0.01; // room noise
  }
  return { out, times };
}

function detect(out: Float32Array, hop = HOP): number[] {
  const d = new FluxOnsetDetector(SR);
  const hits: number[] = [];
  for (let i = 1024; i < out.length; i += hop) if (d.push(out.subarray(i - 1024, i), (i / SR) * 1000)) hits.push((i / SR) * 1000);
  return hits;
}

describe("strum detection over a ringing chord", () => {
  const cases: [string, number, number, boolean][] = [
    ["G", 70, 1, false],
    ["G", 70, 3, false], // rings ~1.5 s: the case the old loudness detector missed
    ["C", 70, 5, false], // rings ~2.5 s, barely decays between strums
    ["Em", 90, 3, true], // down-up eighths, softer upstrokes
    ["D", 120, 3, false],
  ];
  for (const [chord, bpm, ring, eighths] of cases) {
    it(`hears every ${eighths ? "eighth-note " : ""}strum of ${chord} at ${bpm} bpm, ring ×${ring}`, () => {
      const n = 16;
      const { out, times } = strummed(chord, bpm, n, ring, eighths);
      // Screen refresh rates vary, so check a few analysis hops (8, 16, 21 ms).
      for (const hop of [384, 768, 1024]) {
      const hits = detect(out, hop);
      const matched = times.filter((t) => hits.some((h) => h - t >= 0 && h - t < 60)).length;
      // Upstrokes here are only 30-40% as loud as the downstrokes over a chord
      // that is still ringing; allow one more miss for those.
      expect(matched, `hop ${hop}`).toBeGreaterThanOrEqual(eighths ? n - 2 : n - 1);
      // At most a couple of stray detections (they happen with very long
      // sustain); the rhythm score ignores strays far off the beat.
      expect(hits.length, `hop ${hop}`).toBeLessThanOrEqual(n + 2);
      }
    });
  }

  it("stays quiet on a single chord left to ring", () => {
    const { out } = strummed("G", 60, 1, 5);
    expect(detect(out).length).toBe(1);
  });
});
