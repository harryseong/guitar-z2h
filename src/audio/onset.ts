import { magnitudeSpectrum } from "./fft";
import { rms } from "./pitch";

/**
 * Strum/pluck onset detector based on spectral flux: it measures how much
 * new energy appears across the spectrum since the previous frame. A
 * re-strum refreshes the pick attack and the upper harmonics even while the
 * last chord is still ringing, so it shows up clearly here, whereas plain
 * loudness barely changes.
 */
export class FluxOnsetDetector {
  /** Recent log spectra with their times, newest last. */
  private past: { t: number; spec: Float64Array }[] = [];
  private history: number[] = [];
  private lastOnset = -Infinity;
  private lastFlux = 0;
  /** Recent strong-onset level, decaying, so tiny wobbles in a long ring can't trigger. */
  private peak = 0;
  private peakTime = 0;
  constructor(
    private sampleRate: number,
    private sensitivity = 1.4,
    private refractoryMs = 100,
    private minRms = 0.004,
    private lagMs = 30,
    private peakRatio = 0.25,
  ) {}

  /** Feed the latest block of audio (e.g. 1024 samples). Returns true on a new strum. */
  push(frame: ArrayLike<number>, timeMs: number): boolean {
    const mags = magnitudeSpectrum(frame);
    const binHz = this.sampleRate / frame.length;
    const kMin = Math.max(2, Math.floor(60 / binHz));
    const kMax = Math.min(mags.length - 2, Math.floor(8000 / binHz));
    const cur = new Float64Array(mags.length);
    for (let k = kMin - 1; k <= kMax + 1; k++) cur[k] = Math.log1p(10 * mags[k]);

    // "SuperFlux" style: compare with the spectrum ~30 ms earlier (a strum
    // across six strings takes about that long), whatever the frame rate, and
    // with each bin's louder neighbour, so a ringing chord's slight wobble
    // doesn't count as new sound.
    let flux = 0;
    let ref: Float64Array | undefined;
    for (const p of this.past) if (timeMs - p.t >= this.lagMs) ref = p.spec;
    ref ??= this.past[0]?.spec;
    if (ref) for (let k = kMin; k <= kMax; k++) flux += Math.max(0, cur[k] - Math.max(ref[k - 1], ref[k], ref[k + 1]));
    this.past.push({ t: timeMs, spec: cur });
    while (this.past.length > 1 && timeMs - this.past[1].t >= this.lagMs) this.past.shift();

    // Adaptive threshold: well above the median flux of the last ~30 frames.
    const sorted = [...this.history].sort((a, b) => a - b);
    const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
    this.history.push(flux);
    if (this.history.length > 30) this.history.shift();
    // Decay the remembered peak with a ~1.5 s half-life.
    this.peak *= 0.5 ** ((timeMs - this.peakTime) / 1500);
    this.peakTime = timeMs;
    this.peak = Math.max(this.peak, flux);
    const threshold = Math.max(median * this.sensitivity + (kMax - kMin) * 0.02, this.peak * this.peakRatio);

    const loudEnough = rms(frame) > this.minRms;
    // Fire on the rising edge so one attack spread over a few frames counts once.
    const isOnset =
      loudEnough && flux > threshold && flux > this.lastFlux && timeMs - this.lastOnset > this.refractoryMs;
    this.lastFlux = flux;
    if (isOnset) this.lastOnset = timeMs;
    return isOnset;
  }
}

/**
 * Offset in ms of `t` from the nearest grid point (grid starts at `start`,
 * spaced `step` ms). Negative = early, positive = late.
 */
export function gridOffset(t: number, start: number, step: number): number {
  const k = Math.round((t - start) / step);
  return t - (start + k * step);
}

export function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

export function stdDev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1));
}

/**
 * Timing spread that ignores stray detections. Offsets are measured around
 * their median (which absorbs the device's constant audio delay); anything
 * further than `maxDevMs` from it is a missed beat or a false detection,
 * not a slightly early/late strum, so it's counted separately.
 */
export function robustSpread(offsets: number[], maxDevMs: number): { spread: number; kept: number; strays: number } {
  if (!offsets.length) return { spread: 0, kept: 0, strays: 0 };
  const sorted = [...offsets].sort((a, b) => a - b);
  const med = sorted[Math.floor(sorted.length / 2)];
  const kept = offsets.filter((o) => Math.abs(o - med) <= maxDevMs);
  return { spread: stdDev(kept), kept: kept.length, strays: offsets.length - kept.length };
}
