/**
 * Look-ahead scheduled metronome (the "two clocks" pattern) so clicks stay
 * sample-accurate even when the main thread is busy.
 */
export class Metronome {
  bpm = 70;
  beatsPerBar = 4;
  /** Keep time (and fire onBeat) without sounding clicks. */
  muted = false;
  /** Called (on the main thread, approximately on time) for each beat. */
  onBeat: ((beat: number, audioTime: number) => void) | null = null;
  /** audioContext time of beat 0 of the current run. */
  startTime = 0;
  private timer = 0;
  private nextTime = 0;
  private beat = 0;
  constructor(private ctx: AudioContext) {}

  get running(): boolean {
    return this.timer !== 0;
  }

  start(): void {
    if (this.running) return;
    this.beat = 0;
    this.startTime = this.nextTime = this.ctx.currentTime + 0.1;
    this.timer = window.setInterval(() => this.schedule(), 25);
    this.schedule();
  }

  stop(): void {
    clearInterval(this.timer);
    this.timer = 0;
  }

  private schedule(): void {
    while (this.nextTime < this.ctx.currentTime + 0.12) {
      if (!this.muted) this.click(this.nextTime, this.beat % this.beatsPerBar === 0);
      const beat = this.beat;
      const at = this.nextTime;
      const delay = Math.max(0, (at - this.ctx.currentTime) * 1000);
      window.setTimeout(() => this.onBeat?.(beat, at), delay);
      this.nextTime += 60 / this.bpm;
      this.beat++;
    }
  }

  private click(time: number, accent: boolean): void {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.value = accent ? 1600 : 1000;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(accent ? 0.5 : 0.3, time + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.04);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(time);
    osc.stop(time + 0.05);
  }
}
