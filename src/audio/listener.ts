import { chromaFromSignal } from "./chroma";
import { engine } from "./engine";
import { rms } from "./pitch";

/**
 * Smoothed chroma from the microphone. Call `update()` from a loop; it
 * returns null while the guitar is silent.
 */
export class ChordListener {
  private smooth = new Float64Array(12);
  private silentFrames = 0;
  level = 0;

  update(): Float64Array | null {
    const buf = engine.read(8192);
    this.level = rms(buf);
    if (this.level < 0.01) {
      if (++this.silentFrames > 2) this.smooth.fill(0);
      return null;
    }
    this.silentFrames = 0;
    const c = chromaFromSignal(buf, engine.sampleRate);
    for (let i = 0; i < 12; i++) this.smooth[i] = this.smooth[i] * 0.4 + c[i] * 0.6;
    return this.smooth;
  }

  reset(): void {
    this.smooth.fill(0);
  }
}
