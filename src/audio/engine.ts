/**
 * Owns the microphone stream and a shared AnalyserNode. Views pull the most
 * recent block of samples from it on their own schedule.
 */
export class AudioEngine {
  ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private stream: MediaStream | null = null;
  private buf: Float32Array<ArrayBuffer> = new Float32Array(8192);
  private listeners = new Set<() => void>();

  get running(): boolean {
    return this.analyser !== null;
  }

  get sampleRate(): number {
    return this.ctx?.sampleRate ?? 48000;
  }

  /** Must be called from a user gesture (browser autoplay rules). */
  async start(): Promise<void> {
    if (this.running) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("This browser cannot access the microphone. Try a recent Chrome, Edge, Firefox or Safari over https.");
    }
    // Voice processing (echo cancel, noise suppression, AGC) mangles
    // instrument audio, so ask for the raw signal.
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
    this.ctx ??= new AudioContext();
    await this.ctx.resume();
    const src = this.ctx.createMediaStreamSource(this.stream);
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 8192;
    this.analyser.smoothingTimeConstant = 0;
    src.connect(this.analyser);
    this.buf = new Float32Array(this.analyser.fftSize);
    this.listeners.forEach((l) => l());
  }

  stop(): void {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.analyser?.disconnect();
    this.analyser = null;
    this.listeners.forEach((l) => l());
  }

  /** Latest `size` samples (size <= 8192). Returns a view, do not keep it. */
  read(size = 8192): Float32Array {
    if (!this.analyser) return this.buf.subarray(0, size);
    this.analyser.getFloatTimeDomainData(this.buf);
    return this.buf.subarray(this.buf.length - size);
  }

  /** Audio context for output (metronome) without needing the mic. */
  output(): AudioContext {
    this.ctx ??= new AudioContext();
    void this.ctx.resume();
    return this.ctx;
  }

  onChange(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
}

export const engine = new AudioEngine();

/** Run `fn` roughly every `intervalMs` while the page is visible. Returns a stop function. */
export function loop(fn: (now: number) => void, intervalMs = 0): () => void {
  let raf = 0;
  let last = 0;
  const tick = (now: number) => {
    if (now - last >= intervalMs) {
      last = now;
      fn(now);
    }
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}
