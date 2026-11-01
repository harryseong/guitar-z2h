import { QUALITY_INTERVALS, chordName, type Quality } from "../music/chords";

export interface ChordGuess {
  root: number;
  quality: Quality;
  name: string;
  /** Cosine similarity between chroma and chord template (0..1). */
  score: number;
}

export interface ChordCandidate {
  root: number;
  quality: Quality;
}

const ALL_QUALITIES = Object.keys(QUALITY_INTERVALS) as Quality[];

/** Every root x quality combination. */
export const ALL_CANDIDATES: ChordCandidate[] = ALL_QUALITIES.flatMap((quality) =>
  Array.from({ length: 12 }, (_, root) => ({ root, quality })),
);

/**
 * Harmonic-aware template: each chord tone also contributes energy at its
 * octave (2nd/4th harmonic), fifth (3rd/6th) and major third (5th), the way
 * a real string does. Without this, an open A chord's E strings make it
 * look like Esus4 or Amaj7.
 */
const HARMONIC_DECAY = 0.6;
const HARMONIC_OFFSETS = [0, 0, 7, 0, 4, 7]; // semitone class of harmonics 1..6
function template(root: number, quality: Quality): Float64Array {
  const t = new Float64Array(12);
  for (const iv of QUALITY_INTERVALS[quality]) {
    HARMONIC_OFFSETS.forEach((off, h) => {
      t[(root + iv + off) % 12] += HARMONIC_DECAY ** h;
    });
  }
  return t;
}

/** Slight prior toward plain triads: a 7th must earn its extra note. */
function prior(quality: Quality): number {
  return QUALITY_INTERVALS[quality].length > 3 ? 0.97 : 1;
}

const templateCache = new Map<string, Float64Array>();
function cachedTemplate(root: number, quality: Quality): Float64Array {
  const key = `${root}:${quality}`;
  let t = templateCache.get(key);
  if (!t) templateCache.set(key, (t = template(root, quality)));
  return t;
}

function cosine(a: ArrayLike<number>, b: ArrayLike<number>): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < 12; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na === 0 || nb === 0 ? 0 : dot / Math.sqrt(na * nb);
}

/** Rank candidate chords against a chroma vector, best first. */
export function rankChords(chroma: ArrayLike<number>, candidates: ChordCandidate[] = ALL_CANDIDATES): ChordGuess[] {
  return candidates
    .map(({ root, quality }) => ({
      root,
      quality,
      name: chordName(root, quality),
      score: cosine(chroma, cachedTemplate(root, quality)) * prior(quality),
    }))
    .sort((a, b) => b.score - a.score);
}

/**
 * Decide whether `target` is what is being played. The target must be the
 * best match (or within `margin` of it, since e.g. G and G7 share most notes)
 * and clear an absolute score threshold.
 */
export function isChordPlayed(
  chroma: ArrayLike<number>,
  target: ChordCandidate,
  { minScore = 0.72, margin = 0.02 }: { minScore?: number; margin?: number } = {},
): { played: boolean; score: number; best: ChordGuess } {
  const ranked = rankChords(chroma);
  const best = ranked[0];
  const score = cosine(chroma, cachedTemplate(target.root, target.quality)) * prior(target.quality);
  return { played: score >= minScore && score >= best.score - margin, score, best };
}
