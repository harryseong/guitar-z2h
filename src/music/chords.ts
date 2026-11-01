import { NOTE_NAMES, STANDARD_TUNING } from "./notes";

export type Quality = "maj" | "min" | "7" | "maj7" | "m7" | "sus2" | "sus4";

export const QUALITY_INTERVALS: Record<Quality, number[]> = {
  maj: [0, 4, 7],
  min: [0, 3, 7],
  "7": [0, 4, 7, 10],
  maj7: [0, 4, 7, 11],
  m7: [0, 3, 7, 10],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
};

const QUALITY_SUFFIX: Record<Quality, string> = {
  maj: "",
  min: "m",
  "7": "7",
  maj7: "maj7",
  m7: "m7",
  sus2: "sus2",
  sus4: "sus4",
};

export function chordName(root: number, quality: Quality): string {
  return `${NOTE_NAMES[root]}${QUALITY_SUFFIX[quality]}`;
}

export interface ChordShape {
  name: string;
  root: number;
  quality: Quality;
  /** Fret per string, low E (6th) first. -1 = muted, 0 = open. */
  frets: [number, number, number, number, number, number];
  /** Finger per string (1-4), 0 = none. Same order as frets. */
  fingers?: [number, number, number, number, number, number];
  /** Fret of a barre, if the shape uses one. */
  barre?: number;
}

const X = -1;
function shape(
  root: string,
  quality: Quality,
  frets: ChordShape["frets"],
  fingers?: ChordShape["fingers"],
  barre?: number,
): ChordShape {
  const r = NOTE_NAMES.indexOf(root as (typeof NOTE_NAMES)[number]);
  if (r < 0) throw new Error(`bad root ${root}`);
  return { name: chordName(r, quality), root: r, quality, frets, fingers, barre };
}

/** Common open and first-position shapes, in the order a returning player meets them. */
export const CHORDS: ChordShape[] = [
  shape("E", "min", [0, 2, 2, 0, 0, 0], [0, 2, 3, 0, 0, 0]),
  shape("E", "maj", [0, 2, 2, 1, 0, 0], [0, 2, 3, 1, 0, 0]),
  shape("A", "min", [X, 0, 2, 2, 1, 0], [0, 0, 2, 3, 1, 0]),
  shape("A", "maj", [X, 0, 2, 2, 2, 0], [0, 0, 1, 2, 3, 0]),
  shape("D", "maj", [X, X, 0, 2, 3, 2], [0, 0, 0, 1, 3, 2]),
  shape("D", "min", [X, X, 0, 2, 3, 1], [0, 0, 0, 2, 3, 1]),
  shape("G", "maj", [3, 2, 0, 0, 0, 3], [2, 1, 0, 0, 0, 3]),
  shape("C", "maj", [X, 3, 2, 0, 1, 0], [0, 3, 2, 0, 1, 0]),
  shape("F", "maj", [1, 3, 3, 2, 1, 1], [1, 3, 4, 2, 1, 1], 1),
  shape("B", "min", [X, 2, 4, 4, 3, 2], [0, 1, 3, 4, 2, 1], 2),
  shape("G", "7", [3, 2, 0, 0, 0, 1], [3, 2, 0, 0, 0, 1]),
  shape("C", "7", [X, 3, 2, 3, 1, 0], [0, 3, 2, 4, 1, 0]),
  shape("D", "7", [X, X, 0, 2, 1, 2], [0, 0, 0, 2, 1, 3]),
  shape("A", "7", [X, 0, 2, 0, 2, 0], [0, 0, 2, 0, 3, 0]),
  shape("E", "7", [0, 2, 0, 1, 0, 0], [0, 2, 0, 1, 0, 0]),
  shape("B", "7", [X, 2, 1, 2, 0, 2], [0, 2, 1, 3, 0, 4]),
  shape("A", "m7", [X, 0, 2, 0, 1, 0], [0, 0, 2, 0, 1, 0]),
  shape("E", "m7", [0, 2, 2, 0, 3, 0], [0, 1, 2, 0, 3, 0]),
  shape("C", "maj7", [X, 3, 2, 0, 0, 0], [0, 3, 2, 0, 0, 0]),
  shape("F", "maj7", [X, X, 3, 2, 1, 0], [0, 0, 3, 2, 1, 0]),
  shape("D", "sus2", [X, X, 0, 2, 3, 0], [0, 0, 0, 1, 3, 0]),
  shape("D", "sus4", [X, X, 0, 2, 3, 3], [0, 0, 0, 1, 3, 4]),
  shape("A", "sus2", [X, 0, 2, 2, 0, 0], [0, 0, 1, 2, 0, 0]),
  shape("A", "sus4", [X, 0, 2, 2, 3, 0], [0, 0, 1, 2, 3, 0]),
];

export function findChord(name: string): ChordShape | undefined {
  return CHORDS.find((c) => c.name === name);
}

/** MIDI notes sounded by a shape in standard tuning. */
export function shapeMidiNotes(s: ChordShape): number[] {
  return s.frets.flatMap((f, i) => (f < 0 ? [] : [STANDARD_TUNING[i].midi + f]));
}
