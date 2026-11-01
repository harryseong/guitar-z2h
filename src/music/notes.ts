export const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;
export type NoteName = (typeof NOTE_NAMES)[number];

/** Fractional MIDI note number for a frequency. A4 = 69. */
export function freqToMidi(freq: number, a4 = 440): number {
  return 69 + 12 * Math.log2(freq / a4);
}

export function midiToFreq(midi: number, a4 = 440): number {
  return a4 * 2 ** ((midi - 69) / 12);
}

export function pitchClass(midi: number): number {
  return ((Math.round(midi) % 12) + 12) % 12;
}

export function midiToName(midi: number): string {
  const m = Math.round(midi);
  return `${NOTE_NAMES[pitchClass(m)]}${Math.floor(m / 12) - 1}`;
}

export interface NoteReading {
  /** Nearest equal-tempered MIDI note. */
  midi: number;
  name: NoteName;
  octave: number;
  /** Deviation from the nearest note in cents (-50..50). */
  cents: number;
}

export function noteFromFreq(freq: number, a4 = 440): NoteReading {
  const exact = freqToMidi(freq, a4);
  const midi = Math.round(exact);
  return {
    midi,
    name: NOTE_NAMES[pitchClass(midi)],
    octave: Math.floor(midi / 12) - 1,
    cents: (exact - midi) * 100,
  };
}

export interface GuitarString {
  /** 6 = low E ... 1 = high e (guitarist numbering). */
  number: number;
  label: string;
  midi: number;
}

/** Standard tuning, listed low (6th string) to high (1st string). */
export const STANDARD_TUNING: GuitarString[] = [
  { number: 6, label: "E2", midi: 40 },
  { number: 5, label: "A2", midi: 45 },
  { number: 4, label: "D3", midi: 50 },
  { number: 3, label: "G3", midi: 55 },
  { number: 2, label: "B3", midi: 59 },
  { number: 1, label: "E4", midi: 64 },
];

/** Index into STANDARD_TUNING of the open string closest to freq, plus cents offset from it. */
export function nearestString(freq: number, a4 = 440): { index: number; cents: number } {
  const exact = freqToMidi(freq, a4);
  let best = 0;
  for (let i = 1; i < STANDARD_TUNING.length; i++) {
    if (Math.abs(exact - STANDARD_TUNING[i].midi) < Math.abs(exact - STANDARD_TUNING[best].midi)) best = i;
  }
  return { index: best, cents: (exact - STANDARD_TUNING[best].midi) * 100 };
}
