/**
 * Simple energy-based strum/pluck onset detector. Feed it consecutive short
 * frames; it reports an onset when energy jumps well above its recent level.
 */
export class OnsetDetector {
  private level = 0;
  private lastOnset = -Infinity;
  constructor(
    private ratio = 2.2,
    private minRms = 0.02,
    private refractoryMs = 110,
  ) {}

  /** Returns true if this frame starts a new note/strum. */
  push(frameRms: number, timeMs: number): boolean {
    const isOnset =
      frameRms > this.minRms && frameRms > this.level * this.ratio && timeMs - this.lastOnset > this.refractoryMs;
    // Fast attack, slow release envelope follower.
    this.level = frameRms > this.level ? frameRms : this.level * 0.92 + frameRms * 0.08;
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
