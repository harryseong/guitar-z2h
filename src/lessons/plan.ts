/**
 * Lesson plans. Each task either links to an interactive tool in the app
 * (which listens to you) or is an off-screen exercise with a timer.
 */

export type Task =
  | { kind: "tune" }
  | { kind: "check"; chords: string[] }
  | { kind: "changes"; chords: string[]; goal: number }
  | { kind: "rhythm"; bpm: number; pattern: string }
  | { kind: "notes"; strings: number[] }
  | { kind: "practice" };

export interface LessonTask {
  id: string;
  title: string;
  minutes: number;
  detail: string;
  task: Task;
}

export interface Session {
  id: string;
  title: string;
  tasks: LessonTask[];
}

export interface Week {
  id: string;
  title: string;
  focus: string;
  sessions: Session[];
}

export interface Level {
  id: string;
  title: string;
  tagline: string;
  goals: string[];
  /** Fully built-out weekly sessions. */
  weeks: Week[];
  /** For levels not yet built out: the milestones you will work through. */
  milestones?: string[];
}

/* ---------- task builders (keep the data below readable) ---------- */
const id = (_prefix: string) => ""; // replaced with a stable id below

const tune = (): LessonTask => ({
  id: id("t"),
  title: "Tune up",
  minutes: 2,
  detail: "Tune all six strings. Pluck each string once and let it ring; aim for the needle inside ±5 cents.",
  task: { kind: "tune" },
});

const spider = (bpm: number): LessonTask => ({
  id: id("t"),
  title: `Finger warm-up at ${bpm} bpm`,
  minutes: 4,
  detail:
    "Chromatic 'spider': frets 1-2-3-4 on each string, low E to high e and back, one finger per fret. " +
    "One note per click. Keep fingers close to the strings and press just behind the fret.",
  task: { kind: "rhythm", bpm, pattern: "1 2 3 4" },
});

const check = (chords: string[], detail: string): LessonTask => ({
  id: id("t"),
  title: `Chord check: ${chords.join(", ")}`,
  minutes: 5,
  detail,
  task: { kind: "check", chords },
});

const changes = (chords: string[], goal: number, detail = ""): LessonTask => ({
  id: id("t"),
  title: `One-minute changes: ${chords.join(" ↔ ")}`,
  minutes: 3,
  detail:
    (detail ? detail + " " : "") +
    `Switch as many times as you can in 60 seconds; the app counts each clean change it hears. Target: ${goal}.`,
  task: { kind: "changes", chords, goal },
});

const rhythm = (bpm: number, pattern: string, detail: string): LessonTask => ({
  id: id("t"),
  title: `Strumming: ${pattern} at ${bpm} bpm`,
  minutes: 5,
  detail,
  task: { kind: "rhythm", bpm, pattern },
});

const notes = (strings: number[], detail: string): LessonTask => ({
  id: id("t"),
  title: `Find the note: string${strings.length > 1 ? "s" : ""} ${strings.join(" & ")}`,
  minutes: 4,
  detail,
  task: { kind: "notes", strings },
});

const practice = (title: string, minutes: number, detail: string): LessonTask => ({
  id: id("t"),
  title,
  minutes,
  detail,
  task: { kind: "practice" },
});

/* ---------- Level 1: The Comeback ---------- */

const comeback: Level = {
  id: "comeback",
  title: "Level 1 · The Comeback",
  tagline: "Four weeks to get your hands, calluses and timing back, and fix the habits you had before the break.",
  goals: [
    "Play the open chords (E, Em, A, Am, D, Dm, G, C, and the 7ths) cleanly, every string ringing",
    "Change between any two of them 40+ times a minute",
    "Play the F and Bm barre chords",
    "Keep steady time with downstrokes and the 'D DU UDU' pattern at 90 bpm",
    "Play a full song start to finish without stopping",
  ],
  weeks: [
    {
      id: "w1",
      title: "Week 1 · Wake the hands up",
      focus:
        "Short sessions, about 20 minutes, ideally daily. Your fingertips will be sore: stop before it hurts. " +
        "This week is an audit of what you still remember.",
      sessions: [
        {
          id: "w1s1",
          title: "Session 1 · Audit",
          tasks: [
            tune(),
            spider(60),
            check(
              ["Em", "Am", "E", "A"],
              "Strum each chord and hold it until the app recognises it. If it doesn't, pick each string one at a time to find the buzzing or muted note.",
            ),
            check(["D", "G", "C", "Dm"], "Same again with the D, G and C family."),
          ],
        },
        {
          id: "w1s2",
          title: "Session 2 · First changes",
          tasks: [
            tune(),
            spider(60),
            changes(["Em", "Am"], 20, "Only one finger shape moves over a string. Lift as a unit, land as a unit."),
            changes(["A", "D"], 20),
            rhythm(70, "D D D D", "Downstrokes on every click, one chord per bar. Focus on hitting exactly with the click."),
          ],
        },
        {
          id: "w1s3",
          title: "Session 3 · G, C and D",
          tasks: [
            tune(),
            spider(66),
            changes(["G", "C"], 20, "Watch your third finger: it's the anchor that moves from the low E string to the A string."),
            changes(["C", "D"], 20),
            changes(["G", "D"], 20),
            rhythm(70, "D D D D", "Play G for a bar, C for a bar, D for a bar, G for a bar. Keep your hand moving even if a chord is late."),
          ],
        },
      ],
    },
    {
      id: "w2",
      title: "Week 2 · Clean changes",
      focus: "Speed comes from economy of motion. Look for 'pivot' fingers that stay put between chords.",
      sessions: [
        {
          id: "w2s1",
          title: "Session 1 · Pivot fingers",
          tasks: [
            tune(),
            spider(72),
            changes(["C", "Am"], 30, "Fingers 1 and 2 never move. Only finger 3 changes strings."),
            changes(["G", "Em"], 30),
            changes(["Am", "Dm"], 25),
            rhythm(70, "D DU D DU", "Add upstrokes on the 'and' of beats 2 and 4. Your hand keeps moving down-up the whole time; it just misses the strings sometimes."),
          ],
        },
        {
          id: "w2s2",
          title: "Session 2 · The 50s progression",
          tasks: [
            tune(),
            changes(["E", "Am"], 30),
            changes(["D", "A"], 30),
            rhythm(76, "D DU D DU", "G, Em, C, D, one bar each, four times through without stopping."),
            notes([6], "Learn the natural notes on the low E string, frets 0 to 12. You need these for barre chords next week."),
          ],
        },
        {
          id: "w2s3",
          title: "Session 3 · Map the bass strings",
          tasks: [
            tune(),
            spider(80),
            notes([6, 5], "Low E and A strings. Say the note out loud before you play it."),
            changes(["G", "C"], 35, "Benchmark: compare with your week 1 score."),
            rhythm(80, "D DU D DU", "C, Am, Dm, G, one bar each. Keep the strumming hand moving through every change."),
          ],
        },
      ],
    },
    {
      id: "w3",
      title: "Week 3 · F, sevenths and the blues",
      focus:
        "The F barre is the wall most returning players hit. Use Fmaj7 as a stepping stone, and expect this to take more than a week.",
      sessions: [
        {
          id: "w3s1",
          title: "Session 1 · Approaching F",
          tasks: [
            tune(),
            check(["Fmaj7", "F"], "Fmaj7 first. Then F: roll your first finger slightly onto its bony edge, keep your thumb low behind the neck, and pull back with the arm rather than squeezing."),
            changes(["C", "Fmaj7"], 30),
            changes(["C", "F"], 15, "Accept buzzing for now. The goal is getting the shape down fast."),
            practice("Barre strength", 3, "Hold the F shape for 10 seconds, release for 10. Five times. Stop if your hand cramps."),
          ],
        },
        {
          id: "w3s2",
          title: "Session 2 · Seventh chords",
          tasks: [
            tune(),
            check(["G7", "C7", "D7", "A7", "E7", "B7"], "Seventh chords add tension that wants to resolve. Hear how G7 pulls towards C."),
            changes(["G7", "C"], 30),
            changes(["E7", "A7"], 30),
            rhythm(80, "D DU UDU", "The 'campfire' pattern: Down, Down-Up, (miss), Up-Down-Up. Say it out loud first."),
          ],
        },
        {
          id: "w3s3",
          title: "Session 3 · 12-bar blues in E",
          tasks: [
            tune(),
            changes(["A7", "B7"], 25),
            changes(["E7", "B7"], 25),
            rhythm(
              80,
              "D DU UDU",
              "12-bar blues: E7 ×4 bars, A7 ×2, E7 ×2, B7, A7, E7, B7. Loop it three times without stopping.",
            ),
            changes(["F", "G"], 15),
          ],
        },
      ],
    },
    {
      id: "w4",
      title: "Week 4 · Put it together",
      focus: "Fewer drills, more music. Benchmark your changes and play real songs end to end.",
      sessions: [
        {
          id: "w4s1",
          title: "Session 1 · Bm and the pop progression",
          tasks: [
            tune(),
            check(["Bm"], "Same barre ideas as F, from the A string at the 2nd fret. Mute the low E with the tip of your first finger."),
            changes(["D", "Bm"], 20),
            changes(["G", "Bm"], 20),
            rhythm(84, "D DU UDU", "G, D, Em, C (the I–V–vi–IV behind hundreds of songs). Then try D, A, Bm, G."),
          ],
        },
        {
          id: "w4s2",
          title: "Session 2 · Song day",
          tasks: [
            tune(),
            spider(90),
            practice(
              "Learn a song",
              15,
              "Pick a song you love that uses these chords. Learn the chord sheet section by section, then play it with the recording. Don't stop for mistakes.",
            ),
            rhythm(90, "D DU UDU", "Play the song's progression with the metronome and check your timing score."),
          ],
        },
        {
          id: "w4s3",
          title: "Session 3 · Benchmark",
          tasks: [
            tune(),
            changes(["G", "C"], 45),
            changes(["Am", "E"], 40),
            changes(["C", "F"], 30),
            changes(["D", "Bm"], 30),
            practice("Play your song for someone", 5, "Or record yourself. Performing exposes things practice doesn't. Then move on to Level 2."),
          ],
        },
      ],
    },
  ],
};

/* ---------- Later levels: outlined, sessions to come ---------- */

const foundations: Level = {
  id: "foundations",
  title: "Level 2 · Solid foundations",
  tagline: "Barre chords everywhere, fingerpicking, and your first scale and solos.",
  goals: [
    "Play E-shape and A-shape barre chords anywhere on the neck",
    "Play basic fingerpicking and Travis picking patterns",
    "Play the minor pentatonic in position 1 and improvise a simple solo over a 12-bar blues",
    "Know every note on the E and A strings instantly",
  ],
  weeks: [],
  milestones: [
    "E-shape and A-shape barre chords: major, minor, 7, m7",
    "Power chords and palm muting",
    "Fingerpicking: thumb-and-three-fingers patterns, then Travis picking",
    "Minor pentatonic position 1, hammer-ons, pull-offs, slides",
    "Rhythm: 16th-note strumming, syncopation, swing feel",
    "Ear training: hear major vs minor, hear I, IV, V changes",
  ],
};

const intermediate: Level = {
  id: "intermediate",
  title: "Level 3 · Intermediate",
  tagline: "See the whole fretboard: the CAGED system, triads, the major scale and real improvisation.",
  goals: [
    "Play any chord in five places using CAGED",
    "Play the major scale and pentatonics in all five positions",
    "Build chords from intervals and understand keys and the Nashville number system",
    "Learn songs by ear",
  ],
  weeks: [],
  milestones: [
    "CAGED shapes and how they connect",
    "Triads on string sets 1-2-3 and 2-3-4",
    "Major scale in five positions, intervals on the fretboard",
    "Diatonic harmony: building chords in a key, ii–V–I",
    "Bends, vibrato and phrasing",
    "Transcribe a solo or a fingerstyle arrangement",
  ],
};

const expert: Level = {
  id: "expert",
  title: "Level 4 · Expert",
  tagline: "Modes, jazz harmony, advanced fingerstyle and your own voice on the instrument.",
  goals: [
    "Improvise fluently over chord changes",
    "Play extended and altered chords and reharmonise songs",
    "Arrange songs for solo fingerstyle guitar",
  ],
  weeks: [],
  milestones: [
    "Modes of the major scale and when to use them",
    "Melodic and harmonic minor, arpeggios over changes",
    "Drop-2 and drop-3 voicings, extended and altered chords",
    "Advanced fingerstyle: percussive technique, harmonics, alternate tunings",
    "Composition and arranging",
  ],
};

export const LEVELS: Level[] = [comeback, foundations, intermediate, expert];

// Stable ids (used as progress keys) derived from position, so editing a
// task's wording doesn't lose anyone's check marks.
for (const level of LEVELS)
  for (const week of level.weeks)
    for (const session of week.sessions) session.tasks.forEach((t, i) => (t.id = `${level.id}.${session.id}.${i}`));

export function allTasks(level: Level): LessonTask[] {
  return level.weeks.flatMap((w) => w.sessions.flatMap((s) => s.tasks));
}

/** App route that runs a lesson task (and ticks it off when you hit the goal), or null for off-screen practice. */
export function lessonTaskHref(lt: LessonTask): string | null {
  const href = taskHref(lt.task);
  if (!href) return null;
  return `${href}${href.includes("?") ? "&" : "?"}task=${encodeURIComponent(lt.id)}`;
}

export function taskHref(t: Task): string | null {
  switch (t.kind) {
    case "tune":
      return "#/tuner";
    case "check":
      return `#/drills/check?chords=${encodeURIComponent(t.chords.join(","))}`;
    case "changes":
      return `#/drills/changes?chords=${encodeURIComponent(t.chords.join(","))}&goal=${t.goal}`;
    case "rhythm":
      return `#/rhythm?bpm=${t.bpm}&pattern=${encodeURIComponent(t.pattern)}`;
    case "notes":
      return `#/drills/notes?strings=${t.strings.join(",")}`;
    case "practice":
      return null;
  }
}
