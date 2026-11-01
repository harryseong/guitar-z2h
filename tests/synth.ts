import { midiToFreq } from "../src/music/notes";

/** Deterministic PRNG so tests are repeatable. */
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
}

/**
 * Rough plucked-string model: harmonics with 1/h amplitude, slight
 * inharmonicity and detune, decaying envelope, plus a little noise.
 * `ring` stretches the decay (2 = rings twice as long).
 */
export function pluck(
  midis: number[],
  { sampleRate = 48000, length = 8192, noise = 0.01, seed = 1, detuneCents = 4, ring = 1 } = {},
): Float32Array {
  const r = rng(seed);
  const out = new Float32Array(length);
  for (const m of midis) {
    const f0 = midiToFreq(m + ((r() - 0.5) * 2 * detuneCents) / 100);
    const amp = 0.6 + r() * 0.4;
    const phase0 = r() * Math.PI * 2;
    for (let h = 1; h <= 8; h++) {
      const f = f0 * h * Math.sqrt(1 + 0.0001 * h * h);
      if (f > sampleRate / 2) break;
      const a = (amp / h) * (h === 1 ? 0.8 : 1);
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        out[i] += a * Math.exp((-t * (1 + h)) / ring) * Math.sin(2 * Math.PI * f * t + phase0 * h);
      }
    }
  }
  let peak = 0;
  for (const v of out) peak = Math.max(peak, Math.abs(v));
  for (let i = 0; i < length; i++) out[i] = (out[i] / peak) * 0.5 + (r() - 0.5) * noise;
  return out;
}
