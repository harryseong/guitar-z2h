import { isChordPlayed, rankChords } from "../audio/chordDetect";
import { engine, loop } from "../audio/engine";
import { ChordListener } from "../audio/listener";
import { detectPitch } from "../audio/pitch";
import { CHORDS, findChord, type ChordShape } from "../music/chords";
import { NOTE_NAMES, STANDARD_TUNING, freqToMidi, pitchClass } from "../music/notes";
import { chordDiagram } from "../ui/chordDiagram";
import { h, type View } from "../ui/dom";
import { levelMeter, micGate } from "../ui/micGate";
import { PASS } from "../lessons/plan";
import { completeTask, dismissFlow, reportProgress } from "../ui/lessonFlow";
import { getScore, recordScore } from "../ui/storage";

/** Frames (~80ms each) a chord must be heard before it counts. */
const HOLD_FRAMES = 3;

function chordsFromParams(params: URLSearchParams, fallback: string[]): ChordShape[] {
  const names = params.get("chords")?.split(",").filter(Boolean) ?? fallback;
  const shapes = names.map((n) => findChord(n)).filter((c): c is ChordShape => Boolean(c));
  return shapes.length ? shapes : fallback.map((n) => findChord(n)!);
}

function drillTabs(active: string, params: URLSearchParams): HTMLElement | string {
  if (params.get("task")) return ""; // in a lesson, stay focused on this drill
  const q = params.get("chords") ? `?chords=${encodeURIComponent(params.get("chords")!)}` : "";
  const tab = (id: string, label: string) =>
    h("a", { href: `#/drills/${id}${id === "notes" ? "" : q}`, class: `tab${active === id ? " active" : ""}` }, label);
  return h(
    "nav",
    { class: "tabs" },
    tab("check", "Chord check"),
    tab("changes", "One-minute changes"),
    tab("notes", "Find the note"),
  );
}

function hearingBars(): { el: HTMLElement; update: (chroma: Float64Array | null) => void } {
  const el = h("div", { class: "hearing" });
  return {
    el,
    update(chroma) {
      el.replaceChildren();
      if (!chroma) {
        el.append(h("span", { class: "muted" }, "Listening… strum a chord"));
        return;
      }
      for (const g of rankChords(chroma).slice(0, 3)) {
        el.append(
          h(
            "div",
            { class: "bar-row" },
            h("span", { class: "bar-label" }, g.name),
            h("div", { class: "bar" }, h("div", { class: "bar-fill", style: `width:${Math.round(g.score * 100)}%` })),
          ),
        );
      }
    },
  };
}

/* ---------------- Chord check ---------------- */

export const chordCheckView: View = (root, params) => {
  const all = !params.get("chords");
  const chords = chordsFromParams(params, ["Em", "Am", "E", "A", "D", "G", "C", "Dm"]);
  const task = params.get("task");
  let index = 0;
  let hold = 0;
  const got = new Set<string>();
  const listener = new ChordListener();
  const meter = levelMeter();
  const bars = hearingBars();
  const status = h("div", { class: "status" });
  const big = h("div", { class: "drill-target" });
  const grid = h("div", { class: "chord-grid" });
  let advanceTimer = 0;

  const select = (i: number) => {
    index = i;
    hold = 0;
    listener.reset();
    render();
  };
  const render = () => {
    const c = chords[index];
    big.replaceChildren(h("div", { class: "chord-name" }, c.name), chordDiagram(c, 170));
    big.classList.toggle("ok", got.has(c.name));
    reportProgress(got.size / chords.length, `${got.size} of ${chords.length} chords recognised${got.size < chords.length ? ` · now playing: ${c.name}` : ""}`);
    status.textContent = got.has(c.name) ? "Nice, that rings clean ✓" : "Strum the chord and let it ring";
    grid.replaceChildren(
      ...chords.map((s, i) =>
        h(
          "button",
          { class: `chord-tile${i === index ? " selected" : ""}${got.has(s.name) ? " done" : ""}`, onclick: () => select(i) },
          h("div", {}, s.name),
          chordDiagram(s, 64),
        ),
      ),
    );
  };

  root.append(
    h("h1", {}, "Drills"),
    drillTabs("check", params),
    micGate(() => {}),
    h(
      "div",
      { class: "card drill" },
      big,
      status,
      h("div", { class: "row" }, h("span", { class: "small muted" }, "Hearing"), meter.el),
      bars.el,
      h(
        "details",
        { class: "small" },
        h("summary", {}, "Not recognised?"),
        h(
          "p",
          {},
          "Pick each string slowly, low to high. A buzz usually means a finger is too far from the fret; a dead note means a finger is touching a neighbouring string. Strings marked × should be muted or not played.",
        ),
      ),
    ),
    h("h2", {}, all ? "Common chords" : "This lesson's chords"),
    grid,
    all
      ? h(
          "details",
          { class: "card" },
          h("summary", {}, "More chords"),
          h(
            "div",
            { class: "chord-grid" },
            ...CHORDS.filter((c) => !chords.includes(c)).map((c) =>
              h("a", { class: "chord-tile", href: `#/drills/check?chords=${encodeURIComponent(c.name)}` }, h("div", {}, c.name), chordDiagram(c, 64)),
            ),
          ),
        )
      : "",
  );
  render();

  const stop = loop(() => {
    if (!engine.running) return;
    const chroma = listener.update();
    meter.set(listener.level);
    bars.update(chroma);
    if (!chroma) return;
    const c = chords[index];
    if (got.has(c.name)) return;
    hold = isChordPlayed(chroma, c).played ? hold + 1 : 0;
    if (hold >= HOLD_FRAMES) {
      got.add(c.name);
      render();
      if (task && chords.every((s) => got.has(s.name))) completeTask(task);
      const next = chords.findIndex((s) => !got.has(s.name));
      if (next >= 0) advanceTimer = window.setTimeout(() => select(next), 1200);
      else status.textContent = "All chords recognised ✓ Great work.";
    }
  }, 80);

  return () => {
    stop();
    clearTimeout(advanceTimer);
  };
};

/* ---------------- One-minute changes ---------------- */

export const changesView: View = (root, params) => {
  const chords = chordsFromParams(params, ["G", "C"]);
  if (chords.length < 2) chords.push(findChord(chords[0].name === "C" ? "G" : "C")!);
  const goal = Number(params.get("goal")) || 0;
  const task = params.get("task");
  const key = chords.map((c) => c.name).join("-");
  const DURATION = 60;

  const listener = new ChordListener();
  const meter = levelMeter();
  const bars = hearingBars();
  let state: "idle" | "countdown" | "running" | "done" = "idle";
  let target = 0;
  let count = 0;
  let hold = 0;
  let started = 0;
  let countdownTimer = 0;

  const current = h("div", { class: "drill-target" });
  const nextEl = h("div", { class: "muted" });
  const timer = h("div", { class: "timer" }, `${DURATION}`);
  const counter = h("div", { class: "counter" }, "0");
  const result = h("div", { class: "result" });
  const startBtn = h("button", { class: "primary", "data-hotkey": "space", onclick: () => void begin() }, "▶ Start 60 seconds");
  const best = () => getScore(`changes.${key}`).best;
  const bestEl = h("span", { class: "muted small" });

  const showTarget = () => {
    const c = chords[target % chords.length];
    const n = chords[(target + 1) % chords.length];
    current.replaceChildren(h("div", { class: "chord-name" }, c.name), chordDiagram(c, 170));
    nextEl.textContent = `next: ${n.name}`;
  };
  const renderMeta = () => {
    bestEl.textContent = `Best: ${best()}${goal ? ` · Goal: ${goal}` : ""}`;
  };
  const showCount = () => (counter.textContent = goal ? `${count} / ${goal}` : String(count));

  const begin = async () => {
    if (!engine.running) {
      try {
        await engine.start();
      } catch {
        result.textContent = "Allow microphone access so the app can hear your chords, then press Start again.";
        return;
      }
    }
    dismissFlow(); // "Go again" means stay on this drill
    state = "countdown";
    startBtn.hidden = true;
    result.replaceChildren();
    count = 0;
    target = 0;
    hold = 0;
    showCount();
    let n = 3;
    current.replaceChildren(h("div", { class: "chord-name" }, String(n)));
    nextEl.textContent = `Get ready: ${chords[0].name}`;
    countdownTimer = window.setInterval(() => {
      n--;
      if (n > 0) current.replaceChildren(h("div", { class: "chord-name" }, String(n)));
      else {
        clearInterval(countdownTimer);
        state = "running";
        started = performance.now();
        listener.reset();
        showTarget();
      }
    }, 1000);
  };

  const finish = () => {
    state = "done";
    if (goal) reportProgress(count >= goal ? 1 : count / goal, count >= goal ? `${count} changes: goal reached` : `${count} of ${goal}: press Go again to retry`);
    const rec = recordScore(`changes.${key}`, count);
    const metGoal = goal > 0 && count >= goal;
    if (task && metGoal) completeTask(task);
    result.replaceChildren(
      h("h2", {}, `${count} changes`),
      h(
        "p",
        {},
        count >= rec.best && rec.history.length > 1 ? "New personal best! " : "",
        goal ? (metGoal ? "Goal reached ✓" : `Goal is ${goal}. Keep at it, this climbs fast with daily practice.`) : "",
      ),
      h("p", { class: "muted small" }, `Last runs: ${rec.history.slice(-5).map((r) => r.score).join(", ")}`),
    );
    startBtn.textContent = "Go again";
    startBtn.hidden = false;
    renderMeta();
  };

  root.append(
    h("h1", {}, "Drills"),
    drillTabs("changes", params),
    micGate(() => {}),
    h(
      "div",
      { class: "card drill" },
      h("div", { class: "row spread" }, h("div", {}, h("div", { class: "small muted" }, "Time"), timer), h("div", {}, h("div", { class: "small muted" }, "Changes"), counter)),
      current,
      nextEl,
      h("div", { class: "row" }, startBtn, bestEl),
      result,
      h("div", { class: "row" }, h("span", { class: "small muted" }, "Hearing"), meter.el),
      bars.el,
    ),
    h(
      "p",
      { class: "muted small" },
      "Strum once on each chord and let it ring until the app hears it, then switch. Speed comes from moving all fingers together, not from rushing the strum. Practise this daily: most players double their score in two weeks.",
    ),
  );
  showTarget();
  renderMeta();
  showCount();
  if (goal) reportProgress(0, `Not started yet. Press Start: you need ${goal} changes in 60 seconds.`);

  const stop = loop((now) => {
    if (!engine.running) return;
    const chroma = listener.update();
    meter.set(listener.level);
    bars.update(chroma);
    if (state !== "running") return;
    const left = Math.max(0, DURATION - (now - started) / 1000);
    timer.textContent = left.toFixed(0);
    if (goal)
      reportProgress(
        count / goal,
        count >= goal ? `✓ Goal reached: ${count} changes · ${left.toFixed(0)}s left to beat your best` : `${count} of ${goal} changes · ${left.toFixed(0)}s left`,
      );
    if (left <= 0) return finish();
    if (!chroma) return;
    const c = chords[target % chords.length];
    hold = isChordPlayed(chroma, c).played ? hold + 1 : 0;
    if (hold >= HOLD_FRAMES) {
      if (target > 0) count++; // landing the first chord starts the clock, not a change
      showCount();
      // Hit the goal before time's up: offer to move on now, run keeps going.
      if (task && goal && count === goal) completeTask(task, { stillPlaying: true });
      counter.classList.remove("pop");
      void counter.offsetWidth;
      counter.classList.add("pop");
      target++;
      hold = 0;
      showTarget();
    }
  }, 80);

  return () => {
    stop();
    clearInterval(countdownTimer);
  };
};

/* ---------------- Find the note ---------------- */

const NATURALS = [0, 2, 4, 5, 7, 9, 11];

export const notesView: View = (root, params) => {
  const strings = (params.get("strings") ?? "6,5")
    .split(",")
    .map(Number)
    .filter((n) => n >= 1 && n <= 6);
  if (!strings.length) strings.push(6);
  const includeSharps = params.get("sharps") === "1";
  const task = params.get("task");
  const pool = includeSharps ? [...Array(12).keys()] : NATURALS;
  let targetString = strings[0];
  let targetPc = 0;
  let hold = 0;
  let correct = 0;
  let solved = false;
  let askedAt = 0;
  const times: number[] = [];

  const prompt = h("div", { class: "drill-target" });
  const feedback = h("div", { class: "status" });
  const stats = h("div", { class: "muted small" });
  const heard = h("div", { class: "muted" }, "–");
  const reveal = h("button", { onclick: () => showAnswer() }, "Show me");
  const skip = h("button", { onclick: () => next() }, "Skip");

  const stringInfo = (n: number) => STANDARD_TUNING.find((s) => s.number === n)!;
  const fretFor = (n: number, pc: number) => (pc - pitchClass(stringInfo(n).midi) + 12) % 12;
  const showAnswer = () => {
    const f = fretFor(targetString, targetPc);
    feedback.textContent = `${NOTE_NAMES[targetPc]} is at fret ${f}${f < 12 ? ` and ${f + 12}` : ""} on string ${targetString}.`;
  };

  const next = () => {
    let pc: number;
    let s: number;
    do {
      pc = pool[Math.floor(Math.random() * pool.length)];
      s = strings[Math.floor(Math.random() * strings.length)];
    } while (pc === targetPc && s === targetString && pool.length > 1);
    targetPc = pc;
    targetString = s;
    hold = 0;
    solved = false;
    askedAt = performance.now();
    prompt.classList.remove("ok");
    prompt.replaceChildren(
      h("div", { class: "chord-name" }, NOTE_NAMES[pc]),
      h("div", {}, `on string ${s} (${stringInfo(s).label.replace(/\d/, "")})`),
    );
    feedback.textContent = "Find it and pluck it";
  };

  const renderStats = () => {
    const avg = times.length ? times.reduce((a, b) => a + b, 0) / times.length / 1000 : 0;
    stats.textContent = `Correct: ${correct}${times.length ? ` · average ${avg.toFixed(1)}s` : ""}`;
    reportProgress(correct / PASS.notesToFind, `${Math.min(correct, PASS.notesToFind)} of ${PASS.notesToFind} notes found`);
  };

  root.append(
    h("h1", {}, "Drills"),
    drillTabs("notes", params),
    micGate(() => {}),
    h(
      "div",
      { class: "card drill" },
      prompt,
      feedback,
      h("div", { class: "row" }, h("span", { class: "small muted" }, "Hearing:"), heard),
      h("div", { class: "row" }, reveal, skip),
      stats,
    ),
    h(
      "div",
      { class: "row small" },
      h("span", { class: "muted" }, "Strings:"),
      ...[6, 5, 4, 3, 2, 1].map((n) =>
        h(
          "a",
          {
            class: `chip${strings.includes(n) ? " selected" : ""}`,
            href: `#/drills/notes?strings=${(strings.includes(n) ? strings.filter((x) => x !== n) : [...strings, n]).join(",") || n}${includeSharps ? "&sharps=1" : ""}`,
          },
          String(n),
        ),
      ),
      h("a", { class: `chip${includeSharps ? " selected" : ""}`, href: `#/drills/notes?strings=${strings.join(",")}${includeSharps ? "" : "&sharps=1"}` }, "♯/♭ too"),
    ),
    h(
      "p",
      { class: "muted small" },
      "Knowing where the notes are on the low E and A strings is what makes barre chords and scales click: the root of most shapes sits on one of them. Trick: fret 5 of any string is the next string's open note (except G to B, which is fret 4).",
    ),
  );
  next();
  renderStats();

  let nextTimer = 0;
  const stop = loop(() => {
    if (!engine.running || solved) return;
    const p = detectPitch(engine.read(4096), engine.sampleRate);
    if (!p || p.clarity < 0.85) {
      hold = 0;
      return;
    }
    const midi = freqToMidi(p.freq);
    const n = Math.round(midi);
    heard.textContent = `${NOTE_NAMES[pitchClass(n)]}${Math.floor(n / 12) - 1}`;
    const open = stringInfo(targetString).midi;
    // Accept the right note anywhere frets 0-15 on that string could produce it.
    const ok = pitchClass(n) === targetPc && n >= open && n <= open + 15;
    hold = ok ? hold + 1 : 0;
    if (hold >= 3) {
      solved = true;
      correct++;
      times.push(performance.now() - askedAt);
      prompt.classList.add("ok");
      feedback.textContent = `✓ ${NOTE_NAMES[targetPc]} – fret ${n - open}`;
      renderStats();
      if (task && correct >= PASS.notesToFind) completeTask(task);
      nextTimer = window.setTimeout(next, 1100);
    }
  }, 60);

  return () => {
    stop();
    clearTimeout(nextTimer);
  };
};
