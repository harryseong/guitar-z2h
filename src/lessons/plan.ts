/**
 * Lesson plans. Each task either links to an interactive tool in the app
 * (which listens to you) or is an off-screen exercise with a timer.
 */

export type Task =
  | { kind: "tune" }
  | { kind: "check"; chords: string[] }
  | { kind: "changes"; chords: string[]; goal: number }
  | { kind: "rhythm"; bpm: number; pattern: string; chords?: string[] }
  | { kind: "warmup"; bpm: number; minutes: number }
  | { kind: "notes"; strings: number[] }
  | { kind: "practice"; minutes: number };

/** Pass marks, shared by the lesson text and the drills that check them. */
export const PASS = {
  tuneCents: 5,
  rhythmSeconds: 30,
  rhythmSpreadMs: 40,
  rhythmMinStrums: 16,
  warmupAccuracy: 0.7,
  notesToFind: 10,
} as const;

/** One sentence: what "done" means for a task. Shown above every drill. */
export function goalText(t: Task): string {
  switch (t.kind) {
    case "tune":
      return `Get all 6 strings in tune: each needle inside the green zone (±${PASS.tuneCents} cents).`;
    case "check":
      return `Play each chord until the app recognises it: ${t.chords.join(", ")}.`;
    case "changes":
      return `Make ${t.goal} clean changes between ${t.chords.join(" and ")} in 60 seconds.`;
    case "rhythm":
      return `Strum along for ${PASS.rhythmSeconds} seconds, keeping your timing within ±${PASS.rhythmSpreadMs} ms of the beat.`;
    case "warmup":
      return `Play the finger exercise with the click for ${t.minutes} minute${t.minutes > 1 ? "s" : ""}, getting ${Math.round(PASS.warmupAccuracy * 100)}% of the notes right.`;
    case "notes":
      return `Find and play ${PASS.notesToFind} notes on string${t.strings.length > 1 ? "s" : ""} ${t.strings.join(" & ")}.`;
    case "practice":
      return `Practise for ${t.minutes} minutes, then press Done.`;
  }
}

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
// Ids are assigned from each task's position further down.
const base = (title: string, minutes: number, detail: string, task: Task): LessonTask => ({ id: "", title, minutes, detail, task });

const tune = (): LessonTask =>
  base("Tune up", 2, "Pluck one string at a time and let it ring. Turn the peg until the needle sits in the green zone and the string turns green.", { kind: "tune" });

const spider = (bpm: number, minutes = 2): LessonTask =>
  base(
    `Finger warm-up at ${bpm} bpm`,
    minutes,
    "The 'spider' exercise. Play one note per click: frets 1, 2, 3, 4 on the low E string with fingers 1, 2, 3, 4, then the same on each string up to the high e, then back down with frets 4, 3, 2, 1. The screen shows the next note and turns each one green when it's right.",
    { kind: "warmup", bpm, minutes },
  );

const check = (chords: string[], detail: string): LessonTask =>
  base(`Chord check: ${chords.join(", ")}`, 5, detail, { kind: "check", chords });

const changes = (chords: string[], goal: number, detail = ""): LessonTask =>
  base(
    `Chord changes: ${chords.join(" ↔ ")}`,
    3,
    `Press Start, then switch back and forth: strum once, and as soon as the app hears the chord, move to the other one.${detail ? " " + detail : ""}`,
    { kind: "changes", chords, goal },
  );

const rhythm = (bpm: number, pattern: string, detail: string, chords?: string[]): LessonTask =>
  base(`Strumming: ${pattern} at ${bpm} bpm`, 5, detail, { kind: "rhythm", bpm, pattern, chords });

const notes = (strings: number[], detail: string): LessonTask =>
  base(`Find the note: string${strings.length > 1 ? "s" : ""} ${strings.join(" & ")}`, 4, detail, { kind: "notes", strings });

const practice = (title: string, minutes: number, detail: string): LessonTask =>
  base(title, minutes, detail, { kind: "practice", minutes });

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
              "Form the chord shown, strum all the strings that aren't marked ×, and let it ring. If the app doesn't recognise it after a few strums, pick the strings one at a time: a buzz means a finger is too far from the fret, a dead note means a finger is touching the next string.",
            ),
            check(["D", "G", "C", "Dm"], "Same as before, with the D, G and C family. Watch for the × strings: on D and Dm, only strum the top four."),
          ],
        },
        {
          id: "w1s2",
          title: "Session 2 · First changes",
          tasks: [
            tune(),
            spider(60),
            changes(["Em", "Am"], 20, "Tip: the shape is the same, just moved over one string. Lift all fingers together and land them together."),
            changes(["A", "D"], 20),
            rhythm(
              70,
              "D D D D",
              "Press Start. After 4 count-in clicks, strum down once on every click, following the chords on screen (one bar each). Keep going for 30 seconds even if a chord comes late.",
              ["Em", "Am", "Em", "Am"],
            ),
          ],
        },
        {
          id: "w1s3",
          title: "Session 3 · G, C and D",
          tasks: [
            tune(),
            spider(66),
            changes(["G", "C"], 20, "Tip: your third finger is the anchor. It moves from the low E string (G) to the A string (C)."),
            changes(["C", "D"], 20),
            changes(["G", "D"], 20),
            rhythm(
              70,
              "D D D D",
              "Press Start. Strum down on every click, following the chords on screen, one bar each. Keep your strumming hand moving even if a chord is late.",
              ["G", "C", "D", "G"],
            ),
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
            changes(["C", "Am"], 30, "Tip: fingers 1 and 2 never move. Only finger 3 changes strings."),
            changes(["G", "Em"], 30),
            changes(["Am", "Dm"], 25),
            rhythm(
              70,
              "D DU D DU",
              "New pattern: follow the D (down) and U (up) boxes on screen. Your hand keeps moving down-up all the time and only touches the strings on the marked boxes.",
              ["C", "Am", "C", "Am"],
            ),
          ],
        },
        {
          id: "w2s2",
          title: "Session 2 · The 50s progression",
          tasks: [
            tune(),
            changes(["E", "Am"], 30),
            changes(["D", "A"], 30),
            rhythm(76, "D DU D DU", "The '50s progression' behind countless songs. Follow the chords on screen, one bar each, without stopping.", ["G", "Em", "C", "D"]),
            notes([6], "The app names a note. Find it on the low E string and pluck it. Knowing these notes is what makes barre chords easy next week. Tip: E is open, F is fret 1, G is fret 3, A is fret 5."),
          ],
        },
        {
          id: "w2s3",
          title: "Session 3 · Map the bass strings",
          tasks: [
            tune(),
            spider(80),
            notes([6, 5], "Now the low E and A strings. Say the note out loud before you play it. Tip: on the A string, B is fret 2, C is fret 3, D is fret 5."),
            changes(["G", "C"], 35, "This is a benchmark: compare it with your week 1 score."),
            rhythm(80, "D DU D DU", "Follow the chords on screen, one bar each. Keep the strumming hand moving through every change.", ["C", "Am", "Dm", "G"]),
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
            check(
              ["Fmaj7", "F"],
              "Fmaj7 first; it's F without the barre. Then F: lay your first finger across all six strings at fret 1, rolled slightly onto its bony edge. Keep your thumb low behind the neck and pull back with your arm instead of squeezing.",
            ),
            changes(["C", "Fmaj7"], 30),
            changes(["C", "F"], 15, "Some buzzing is fine for now. The goal is getting the shape down quickly."),
            practice("Barre strength", 3, "Hold the F shape for 10 seconds, then relax for 10 seconds. Repeat 5 times. Stop if your hand cramps."),
          ],
        },
        {
          id: "w3s2",
          title: "Session 2 · Seventh chords",
          tasks: [
            tune(),
            check(["G7", "C7", "D7", "A7", "E7", "B7"], "Seventh chords add tension that wants to resolve. After each one, listen to how G7 pulls towards C."),
            changes(["G7", "C"], 30),
            changes(["E7", "A7"], 30),
            rhythm(
              80,
              "D DU UDU",
              "The 'campfire' pattern: Down, Down-Up, (miss), Up-Down-Up. Say it out loud once before you press Start, then follow the boxes on screen.",
              ["G7", "C", "G7", "C"],
            ),
          ],
        },
        {
          id: "w3s3",
          title: "Session 3 · 12-bar blues in E",
          tasks: [
            tune(),
            changes(["A7", "B7"], 25),
            changes(["E7", "B7"], 25),
            rhythm(80, "D DU UDU", "A 12-bar blues. Follow the chords on screen, one bar each, and loop it as many times as you can.", [
              "E7", "E7", "E7", "E7", "A7", "A7", "E7", "E7", "B7", "A7", "E7", "B7",
            ]),
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
            check(["Bm"], "The same barre idea as F, starting from the A string at fret 2. Mute the low E string with the tip of your first finger."),
            changes(["D", "Bm"], 20),
            changes(["G", "Bm"], 20),
            rhythm(84, "D DU UDU", "The I–V–vi–IV progression behind hundreds of pop songs. Follow the chords on screen, one bar each.", ["G", "D", "Em", "C"]),
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
              "Pick a song you love that uses these chords and look up its chord sheet. Learn it one section at a time, then play along with the recording. Don't stop for mistakes.",
            ),
            rhythm(90, "D DU UDU", "Play your song's chords with the metronome. If it uses other chords, just follow the pattern on screen with the chords shown.", ["G", "D", "Em", "C"]),
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
            practice("Play your song for someone", 5, "Play it for someone, or record yourself. Performing exposes things practice doesn't. Then move on to Level 2."),
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
export function lessonTaskHref(lt: LessonTask): string {
  // Off-screen practice gets a simple timer page so the lesson flow never dead-ends.
  const href = taskHref(lt.task) ?? "#/practice";
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
      return `#/rhythm?bpm=${t.bpm}&pattern=${encodeURIComponent(t.pattern)}${t.chords ? `&chords=${encodeURIComponent(t.chords.join(","))}` : ""}`;
    case "notes":
      return `#/drills/notes?strings=${t.strings.join(",")}`;
    case "warmup":
      return `#/warmup?bpm=${t.bpm}&minutes=${t.minutes}`;
    case "practice":
      return null;
  }
}

export interface TaskLocation {
  level: Level;
  week: Week;
  session: Session;
  /** Position within the session. */
  index: number;
  task: LessonTask;
}

/** Every task of a level in lesson order, with where it sits. */
export function taskLocations(level: Level): TaskLocation[] {
  return level.weeks.flatMap((week) =>
    week.sessions.flatMap((session) => session.tasks.map((task, index) => ({ level, week, session, index, task }))),
  );
}

export function locateTask(id: string): TaskLocation | undefined {
  for (const level of LEVELS) {
    const found = taskLocations(level).find((l) => l.task.id === id);
    if (found) return found;
  }
  return undefined;
}

/** The task after `id` in the same level, or undefined at the end of the level. */
export function nextTaskAfter(id: string): TaskLocation | undefined {
  const here = locateTask(id);
  if (!here) return undefined;
  const all = taskLocations(here.level);
  return all[all.findIndex((l) => l.task.id === id) + 1];
}
