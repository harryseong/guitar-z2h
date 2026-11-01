import { describe, expect, it } from "vitest";
import { spiderSequence } from "../src/views/warmup";

describe("spider warm-up", () => {
  it("goes up frets 1-4 from low E to high e, then back down", () => {
    const seq = spiderSequence();
    expect(seq).toHaveLength(48);
    expect(seq.slice(0, 4).map((n) => n.midi)).toEqual([41, 42, 43, 44]); // F2..G#2 on low E
    expect(seq[23]).toMatchObject({ string: 5, fret: 4, midi: 68 });
    expect(seq[24]).toMatchObject({ string: 5, fret: 4 });
    expect(seq[47]).toMatchObject({ string: 0, fret: 1, midi: 41 });
  });
});
