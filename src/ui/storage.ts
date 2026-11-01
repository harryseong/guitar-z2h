const PREFIX = "gz2h.";

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function save(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* private mode or storage full: progress just won't persist */
  }
}

export type Progress = Record<string, string>; // task id -> ISO date completed

export const progress = {
  get: (): Progress => load<Progress>("progress", {}),
  toggle(id: string): boolean {
    const p = progress.get();
    if (p[id]) delete p[id];
    else p[id] = new Date().toISOString();
    save("progress", p);
    return Boolean(p[id]);
  },
  mark(id: string): void {
    const p = progress.get();
    p[id] ??= new Date().toISOString();
    save("progress", p);
  },
};

export interface ScoreRecord {
  best: number;
  history: { date: string; score: number }[];
}

export function recordScore(key: string, score: number): ScoreRecord {
  const rec = load<ScoreRecord>(`score.${key}`, { best: 0, history: [] });
  rec.best = Math.max(rec.best, score);
  rec.history = [...rec.history, { date: new Date().toISOString(), score }].slice(-50);
  save(`score.${key}`, rec);
  return rec;
}

export function getScore(key: string): ScoreRecord {
  return load<ScoreRecord>(`score.${key}`, { best: 0, history: [] });
}
