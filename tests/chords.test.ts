import { describe, expect, it } from "vitest";
import { chromaFromSignal } from "../src/audio/chroma";
import { isChordPlayed, rankChords } from "../src/audio/chordDetect";
import { CHORDS, QUALITY_INTERVALS, shapeMidiNotes } from "../src/music/chords";
import { pluck } from "./synth";

const SR = 48000;

describe("chord library", () => {
  for (const c of CHORDS) {
    it(`${c.name} shape only contains chord tones`, () => {
      const pcs = new Set(shapeMidiNotes(c).map((m) => (m - c.root + 1200) % 12));
      const allowed = new Set(QUALITY_INTERVALS[c.quality]);
      for (const pc of pcs) expect(allowed.has(pc)).toBe(true);
      expect(pcs.has(0)).toBe(true);
    });
  }
});

describe("chord recognition", () => {
  const triads = CHORDS.filter((c) => c.quality === "maj" || c.quality === "min");
  for (const c of triads) {
    it(`recognises a strummed ${c.name}`, () => {
      const audio = pluck(shapeMidiNotes(c), { sampleRate: SR, length: 8192, seed: c.root + 7 });
      const chroma = chromaFromSignal(audio, SR);
      expect(rankChords(chroma)[0].name).toBe(c.name);
      expect(isChordPlayed(chroma, c).played).toBe(true);
    });
  }

  for (const c of CHORDS) {
    it(`accepts ${c.name} when it is the drill target`, () => {
      const audio = pluck(shapeMidiNotes(c), { sampleRate: SR, length: 8192, seed: c.root + 31 });
      expect(isChordPlayed(chromaFromSignal(audio, SR), c).played).toBe(true);
    });
  }

  it("does not accept the wrong chord in a common change", () => {
    const pairs: [string, string][] = [
      ["G", "C"],
      ["C", "D"],
      ["Em", "C"],
      ["Am", "E"],
      ["D", "Dm"],
      ["A", "Am"],
      ["E", "Em"],
    ];
    for (const [played, target] of pairs) {
      const p = CHORDS.find((c) => c.name === played)!;
      const t = CHORDS.find((c) => c.name === target)!;
      const chroma = chromaFromSignal(pluck(shapeMidiNotes(p), { sampleRate: SR, seed: 99 }), SR);
      expect(isChordPlayed(chroma, t).played, `${played} mistaken for ${target}`).toBe(false);
    }
  });
});
