export interface PitchResult {
  freq: number;
  /** 0..1, how periodic the signal is (1 = perfectly periodic). */
  clarity: number;
}

export interface PitchOptions {
  minFreq?: number;
  maxFreq?: number;
  /** YIN absolute threshold. Lower = stricter. */
  threshold?: number;
  /** Signals quieter than this RMS are treated as silence. */
  minRms?: number;
}

export function rms(buf: ArrayLike<number>): number {
  let s = 0;
  for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
  return Math.sqrt(s / buf.length);
}

/**
 * Monophonic pitch detection using the YIN algorithm
 * (de Cheveigné & Kawahara, 2002). Works well for single guitar strings,
 * where plain autocorrelation tends to jump an octave.
 */
export function detectPitch(
  buf: ArrayLike<number>,
  sampleRate: number,
  { minFreq = 60, maxFreq = 1400, threshold = 0.15, minRms = 0.008 }: PitchOptions = {},
): PitchResult | null {
  if (rms(buf) < minRms) return null;
  const tauMin = Math.max(2, Math.floor(sampleRate / maxFreq));
  const tauMax = Math.min(Math.floor(sampleRate / minFreq), Math.floor(buf.length / 2));
  const w = buf.length - tauMax;
  if (w <= 0 || tauMax <= tauMin) return null;

  // Difference function d(tau) and cumulative mean normalized difference d'(tau).
  const d = new Float64Array(tauMax + 1);
  for (let tau = 1; tau <= tauMax; tau++) {
    let sum = 0;
    for (let i = 0; i < w; i++) {
      const diff = buf[i] - buf[i + tau];
      sum += diff * diff;
    }
    d[tau] = sum;
  }
  const cmnd = new Float64Array(tauMax + 1);
  cmnd[0] = 1;
  let running = 0;
  for (let tau = 1; tau <= tauMax; tau++) {
    running += d[tau];
    cmnd[tau] = running === 0 ? 1 : (d[tau] * tau) / running;
  }

  // First dip below threshold, then walk to its local minimum.
  let tau = -1;
  for (let t = tauMin; t <= tauMax; t++) {
    if (cmnd[t] < threshold) {
      while (t + 1 <= tauMax && cmnd[t + 1] < cmnd[t]) t++;
      tau = t;
      break;
    }
  }
  if (tau === -1) {
    // Fall back to the global minimum if it is reasonably clear.
    let best = tauMin;
    for (let t = tauMin + 1; t <= tauMax; t++) if (cmnd[t] < cmnd[best]) best = t;
    if (cmnd[best] > 0.35) return null;
    tau = best;
  }

  // Parabolic interpolation for sub-sample accuracy.
  let betterTau = tau;
  if (tau > 1 && tau < tauMax) {
    const s0 = cmnd[tau - 1];
    const s1 = cmnd[tau];
    const s2 = cmnd[tau + 1];
    const denom = s0 + s2 - 2 * s1;
    if (denom !== 0) betterTau = tau + (s0 - s2) / (2 * denom);
  }
  const freq = sampleRate / betterTau;
  if (freq < minFreq || freq > maxFreq) return null;
  return { freq, clarity: Math.max(0, Math.min(1, 1 - cmnd[tau])) };
}
