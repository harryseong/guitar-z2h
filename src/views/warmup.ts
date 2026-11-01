import { engine, loop } from "../audio/engine";
import { Metronome } from "../audio/metronome";
import { detectPitch } from "../audio/pitch";
import { PASS } from "../lessons/plan";
import { STANDARD_TUNING, freqToMidi, midiToName } from "../music/notes";
import { h, type View } from "../ui/dom";
import { completeTask, dismissFlow, reportProgress } from "../ui/lessonFlow";
import { levelMeter } from "../ui/micGate";
import { recordScore } from "../ui/storage";

const COUNT_IN_BEATS = 4;

export interface SpiderNote {
  /** Index into STANDARD_TUNING (0 = low E). */
  string: number;
  fret: number;
  midi: number;
}

/** The 1-2-3-4 "spider": up frets 1-4 from low E to high e, then 4-3-2-1 back down. */
export function spiderSequence(): SpiderNote[] {
  const seq: SpiderNote[] = [];
  for (let s = 0; s < 6; s++) for (let f = 1; f <= 4; f++) seq.push({ string: s, fret: f, midi: STANDARD_TUNING[s].midi + f });
  for (let s = 5; s >= 0; s--) for (let f = 4; f >= 1; f--) seq.push({ string: s, fret: f, midi: STANDARD_TUNING[s].midi + f });
  return seq;
}

type CellState = "" | "hit" | "miss";

export const warmupView: View = (root, params) => {
  const ctx = engine.output();
  const met = new Metronome(ctx);
  met.bpm = Math.min(160, Math.max(40, Number(params.get("bpm")) || 60));
  const minutes = Math.min(10, Math.max(0.5, Number(params.get("minutes")) || 2));
  const totalSec = minutes * 60;
  const task = params.get("task");
  const seq = spiderSequence();
  const meter = levelMeter();

  let running = false;
  let playStart = 0; // audio time (s) of the first note
  let lastIdx = -1;
  let hits = 0;
  let played = 0;
  let hitThisNote = false;
  const lapState: CellState[] = seq.map(() => "");

  /* ---- fretboard: high e on top, like tab ---- */
  const cells = new Map<string, HTMLElement>();
  const board = h(
    "div",
    { class: "fretboard" },
    h("div", { class: "fb-row fb-head" }, h("div", { class: "fb-label" }), ...[1, 2, 3, 4].map((f) => h("div", { class: "fb-fret-num" }, `fret ${f}`))),
    ...[5, 4, 3, 2, 1, 0].map((s) =>
      h(
        "div",
        { class: "fb-row" },
        h("div", { class: "fb-label" }, s === 5 ? "e" : STANDARD_TUNING[s].label.replace(/\d/, "")),
        ...[1, 2, 3, 4].map((f) => {
          const c = h("div", { class: "fb-cell" }, h("span", { class: "fb-finger" }, String(f)));
          cells.set(`${s}:${f}`, c);
          return c;
        }),
      ),
    ),
  );
  const cellFor = (n: SpiderNote) => cells.get(`${n.string}:${n.fret}`)!;
  const paint = (cur: number) => {
    // A cell is visited twice per lap (up and down); show the most recent state.
    cells.forEach((c) => c.classList.remove("hit", "miss", "now"));
    seq.forEach((n, i) => {
      if (i < cur && lapState[i]) {
        const c = cellFor(n);
        c.classList.remove("hit", "miss");
        c.classList.add(lapState[i]);
      }
    });
    if (cur >= 0) cellFor(seq[cur]).classList.add("now");
  };

  const phaseEl = h("div", { class: "phase" });
  const detailEl = h("div", { class: "small muted" });
  const nextEl = h("div", { class: "warmup-next" });
  const timeBar = h("div", { class: "progress-fill" });
  const accEl = h("div", { class: "big-stat" }, "–");
  const heardEl = h("div", { class: "big-stat" }, "–");
  const runBtn = h("button", { class: "primary big-btn", onclick: () => void toggle() }, "▶ Start");

  const describe = (n: SpiderNote) => `String ${6 - n.string} (${STANDARD_TUNING[n.string].label.replace(/\d/, "")}) · fret ${n.fret} · finger ${n.fret}`;
  const idle = () => {
    phaseEl.textContent = "Press Start when you're ready";
    detailEl.textContent = `You'll hear ${COUNT_IN_BEATS} clicks to count you in. Then play one note per click, following the highlighted square. Pass mark: ${Math.round(PASS.warmupAccuracy * 100)}% of notes right over ${minutes} minute${minutes > 1 ? "s" : ""}.`;
    nextEl.textContent = `First note: ${describe(seq[0])}`;
  };

  met.onBeat = (beat) => {
    if (!running) return;
    if (beat < COUNT_IN_BEATS) {
      phaseEl.textContent = `Get ready… ${COUNT_IN_BEATS - beat}`;
    } else if (beat === COUNT_IN_BEATS) {
      phaseEl.textContent = "Play!";
    }
  };

  const stopAll = () => {
    running = false;
    met.stop();
    runBtn.textContent = "▶ Start";
  };

  const finish = () => {
    stopAll();
    const acc = played ? hits / played : 0;
    recordScore(`warmup.${met.bpm}`, Math.round(acc * 100));
    const passed = acc >= PASS.warmupAccuracy;
    phaseEl.textContent = passed ? `✓ Passed: ${Math.round(acc * 100)}% of notes right` : `${Math.round(acc * 100)}% of notes right: not quite`;
    detailEl.textContent = passed
      ? "Your fingers are awake. Nice."
      : `You need ${Math.round(PASS.warmupAccuracy * 100)}%. If you keep falling behind, drop the tempo by 10 bpm. If notes are missed, press just behind the fret and pluck a bit harder. Press Start to try again.`;
    reportProgress(passed ? 1 : 0, passed ? `Passed with ${Math.round(acc * 100)}%` : `Not passed: ${Math.round(acc * 100)}% (need ${Math.round(PASS.warmupAccuracy * 100)}%)`);
    if (passed && task) completeTask(task);
  };

  const toggle = async () => {
    if (running) {
      stopAll();
      idle();
      paint(-1);
      reportProgress(0, "Stopped. Press Start to try again.");
      return;
    }
    if (!engine.running) {
      try {
        await engine.start();
      } catch {
        phaseEl.textContent = "Microphone needed";
        detailEl.textContent = "Allow microphone access so the app can hear your notes, then press Start again.";
        return;
      }
    }
    dismissFlow();
    hits = played = 0;
    lastIdx = -1;
    hitThisNote = false;
    lapState.fill("");
    accEl.textContent = heardEl.textContent = "–";
    met.start();
    playStart = met.startTime + (COUNT_IN_BEATS * 60) / met.bpm;
    running = true;
    phaseEl.textContent = `Get ready… ${COUNT_IN_BEATS}`;
    detailEl.textContent = "";
    runBtn.textContent = "■ Stop";
    reportProgress(0, "Counting in…");
  };

  root.append(
    h("h1", {}, "Finger warm-up"),
    h(
      "div",
      { class: "card center" },
      h("div", { class: "small muted" }, `${met.bpm} bpm · one note per click`),
      board,
      nextEl,
      phaseEl,
      detailEl,
      h("div", { class: "progress" }, timeBar),
      h("div", { class: "row", style: "justify-content:center" }, runBtn),
    ),
    h(
      "div",
      { class: "card" },
      h("div", { class: "row spread" }, h("div", {}, h("div", { class: "small muted" }, "Notes right"), accEl), h("div", {}, h("div", { class: "small muted" }, "Hearing"), heardEl)),
      h("div", { class: "row" }, h("span", { class: "small muted" }, "Mic"), meter.el),
      h(
        "p",
        { class: "small muted" },
        "Green squares are notes the app heard correctly, red ones it missed. Use one finger per fret (index on fret 1, pinky on fret 4) and keep each finger down until you need it. Headphones help so the mic doesn't hear the click.",
      ),
    ),
  );
  idle();

  const stop = loop(() => {
    if (!engine.running) return;
    const buf = engine.read(4096);
    meter.set(Math.sqrt(buf.reduce((a, v) => a + v * v, 0) / buf.length));
    const p = detectPitch(buf, engine.sampleRate, { minFreq: 75, maxFreq: 500 });
    const heardMidi = p && p.clarity > 0.8 ? Math.round(freqToMidi(p.freq)) : null;
    heardEl.textContent = heardMidi !== null ? midiToName(heardMidi) : "–";
    if (!running) return;

    const now = ctx.currentTime;
    const elapsed = now - playStart;
    if (elapsed >= totalSec) return finish();
    const beatSec = 60 / met.bpm;
    // A note's window opens a little before its click (players anticipate).
    const n = Math.floor((elapsed + 0.12) / beatSec);
    if (n < 0) return;
    const idx = n % seq.length;
    if (n !== lastIdx) {
      // Close the previous note.
      if (lastIdx >= 0) {
        played++;
        if (hitThisNote) hits++;
        lapState[lastIdx % seq.length] = hitThisNote ? "hit" : "miss";
      }
      if (idx === 0) lapState.fill("");
      lastIdx = n;
      hitThisNote = false;
      nextEl.textContent = describe(seq[idx]);
      paint(idx);
      if (played) accEl.textContent = `${Math.round((hits / played) * 100)}%`;
    }
    if (!hitThisNote && heardMidi === seq[idx].midi) {
      hitThisNote = true;
      cellFor(seq[idx]).classList.add("hit");
    }
    const left = Math.max(0, Math.ceil(totalSec - elapsed));
    timeBar.style.width = `${((elapsed / totalSec) * 100).toFixed(1)}%`;
    const acc = played ? ` · ${Math.round((hits / played) * 100)}% right` : "";
    detailEl.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")} left${acc}`;
    reportProgress(elapsed / totalSec, `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")} left${acc}`);
  }, 0);

  return () => {
    stop();
    met.stop();
  };
};
