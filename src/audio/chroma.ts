import { magnitudeSpectrum } from "./fft";
import { freqToMidi } from "../music/notes";

export interface ChromaOptions {
  minFreq?: number;
  maxFreq?: number;
  a4?: number;
}

/**
 * 12-bin pitch-class profile ("chromagram") of a block of audio.
 * Only spectral peaks are counted, with parabolic interpolation to place
 * each peak accurately, which keeps low strings from smearing into
 * neighbouring pitch classes. Result is normalised so the max bin is 1.
 */
export function chromaFromSignal(
  signal: ArrayLike<number>,
  sampleRate: number,
  { minFreq = 75, maxFreq = 2000, a4 = 440 }: ChromaOptions = {},
): Float64Array {
  const n = signal.length;
  const mags = magnitudeSpectrum(signal);
  const chroma = new Float64Array(12);
  const binHz = sampleRate / n;
  const kMin = Math.max(2, Math.floor(minFreq / binHz));
  const kMax = Math.min(mags.length - 2, Math.ceil(maxFreq / binHz));

  let peakMax = 0;
  for (let k = kMin; k <= kMax; k++) if (mags[k] > peakMax) peakMax = mags[k];
  if (peakMax === 0) return chroma;
  const floor = peakMax * 0.02; // ignore peaks 34 dB below the loudest

  for (let k = kMin; k <= kMax; k++) {
    const m = mags[k];
    if (m < floor || m < mags[k - 1] || m < mags[k + 1]) continue;
    const a = mags[k - 1];
    const c = mags[k + 1];
    const denom = a - 2 * m + c;
    const offset = denom === 0 ? 0 : (0.5 * (a - c)) / denom;
    const freq = (k + offset) * binHz;
    const midi = freqToMidi(freq, a4);
    const nearest = Math.round(midi);
    // Peaks far between semitones are usually leakage or noise.
    if (Math.abs(midi - nearest) > 0.35) continue;
    const pc = ((nearest % 12) + 12) % 12;
    // Compress dynamics so one loud string does not drown the others.
    chroma[pc] += Math.sqrt(m / peakMax);
  }
  let max = 0;
  for (const v of chroma) if (v > max) max = v;
  if (max > 0) for (let i = 0; i < 12; i++) chroma[i] /= max;
  return chroma;
}
