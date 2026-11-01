import { engine, loop } from "../audio/engine";
import { Metronome } from "../audio/metronome";
import { FluxOnsetDetector, gridOffset, mean, robustSpread } from "../audio/onset";
import { rms } from "../audio/pitch";
import { PASS } from "../lessons/plan";
import { findChord } from "../music/chords";
import { h, type View } from "../ui/dom";
import { completeTask, dismissFlow, reportProgress } from "../ui/lessonFlow";
import { levelMeter } from "../ui/micGate";
import { recordScore } from "../ui/storage";

/** Eighth-note slots for one bar: "D", "U" or "" (hand moves but misses). */
const PATTERNS: Record<string, string[]> = {
  "D D D D": ["D", "", "D", "", "D", "", "D", ""],
  "D DU D DU": ["D", "", "D", "U", "D", "", "D", "U"],
  "D DU UDU": ["D", "", "D", "U", "", "U", "D", "U"],
  "DU DU DU DU": ["D", "U", "D", "U", "D", "U", "D", "U"],
};
const COUNTS = ["1", "&", "2", "&", "3", "&", "4", "&"];
const COUNT_IN_BEATS = 4;

function rating(spread: number): string {
  if (spread < 15) return "Rock solid";
  if (spread < 25) return "Tight";
  if (spread < 40) return "Good";
  if (spread < 60) return "Getting there";
  return "Loose";
}

type Phase = "idle" | "countin" | "playing" | "done";

export const rhythmView: View = (root, params) => {
  const ctx = engine.output();
  const met = new Metronome(ctx);
  met.bpm = Math.min(200, Math.max(40, Number(params.get("bpm")) || 70));
  let patternKey = params.get("pattern") ?? "D DU D DU";
  if (!PATTERNS[patternKey]) patternKey = "D DU D DU";
  const chords = (params.get("chords") ?? "").split(",").filter((c) => findChord(c));
  const task = params.get("task");
  let countInOnly = false;

  let onsets = new FluxOnsetDetector(engine.sampleRate);
  const offsets: number[] = [];
  let phase: Phase = "idle";
  let runStart = 0; // audio time (s) of the first count-in click
  const meter = levelMeter();

  /* ---- tempo ---- */
  const bpmLabel = h("span", { class: "bpm" }, String(met.bpm));
  const slider = h("input", { type: "range", min: 40, max: 200, value: met.bpm, "aria-label": "Tempo" }) as HTMLInputElement;
  const setBpm = (v: number) => {
    met.bpm = Math.min(200, Math.max(40, v));
    slider.value = String(met.bpm);
    bpmLabel.textContent = String(met.bpm);
  };
  slider.addEventListener("input", () => setBpm(Number(slider.value)));

  /* ---- pattern ---- */
  const slots = h("div", { class: "pattern" });
  const renderPattern = () =>
    slots.replaceChildren(
      ...PATTERNS[patternKey].map((s, i) =>
        h("div", { class: `slot${s ? "" : " ghost"}` }, h("div", { class: "stroke" }, s ? (s === "D" ? "↓" : "↑") : "·"), h("div", { class: "count" }, COUNTS[i])),
      ),
    );
  const patternSelect = h("select", {}, ...Object.keys(PATTERNS).map((k) => h("option", { value: k, selected: k === patternKey }, k))) as HTMLSelectElement;
  patternSelect.addEventListener("change", () => {
    patternKey = patternSelect.value;
    renderPattern();
  });

  /* ---- chords, one per bar ---- */
  const chordChips = chords.map((c) => h("div", { class: "bar-chord" }, c));
  const highlightBar = (bar: number) => chordChips.forEach((el, i) => el.classList.toggle("on", chords.length > 0 && i === bar % chords.length));

  /* ---- status ---- */
  const phaseEl = h("div", { class: "phase" });
  const detailEl = h("div", { class: "small muted" });
  const beatDots = Array.from({ length: 4 }, () => h("div", { class: "beat-dot" }));
  const timeBar = h("div", { class: "progress-fill" });
  const strumsEl = h("div", { class: "big-stat" }, "–");
  const spreadEl = h("div", { class: "big-stat" }, "–");
  const offsetEl = h("div", { class: "small muted" });
  const runBtn = h("button", { class: "primary big-btn", onclick: () => void toggleRun() }, "▶ Start");
  const countIn = h("input", { type: "checkbox" }) as HTMLInputElement;
  countIn.addEventListener("change", () => (countInOnly = countIn.checked));

  const beatMs = () => (60 / met.bpm) * 1000;
  const step = () => beatMs() / (PATTERNS[patternKey].includes("U") ? 2 : 1);
  /** Further than this from the typical offset = a stray, not a timing error. */
  const maxDev = () => Math.min(120, step() * 0.35);
  const timing = () => robustSpread(offsets, maxDev());
  const playStartMs = () => runStart * 1000 + COUNT_IN_BEATS * beatMs();

  const setPhase = (p: Phase, title: string, detail = "") => {
    phase = p;
    phaseEl.textContent = title;
    detailEl.textContent = detail;
    phaseEl.dataset.phase = p;
  };
  const idleText = () =>
    setPhase(
      "idle",
      "Press Start when you're ready",
      `You'll hear ${COUNT_IN_BEATS} clicks to count you in, then play for up to ${PASS.rhythmSeconds} seconds. You pass as soon as you've played ${PASS.rhythmMinStrums} steady strums (timing within ±${PASS.rhythmSpreadMs} ms).`,
    );

  met.onBeat = (beat) => {
    beatDots.forEach((d, i) => d.classList.toggle("on", i === beat % 4));
    [...slots.children].forEach((el, i) => el.classList.toggle("now", i === (beat % 4) * 2));
    if (beat < COUNT_IN_BEATS) {
      if (phase === "countin") setPhase("countin", `Get ready… ${COUNT_IN_BEATS - beat}`, chords.length ? `First chord: ${chords[0]}` : "");
      highlightBar(0);
    } else {
      if (phase === "countin") setPhase("playing", "Play!", "");
      highlightBar(Math.floor((beat - COUNT_IN_BEATS) / 4));
    }
    if (countInOnly && beat === COUNT_IN_BEATS - 1) met.muted = true;
  };

  const stopMetronome = () => {
    met.stop();
    beatDots.forEach((d) => d.classList.remove("on"));
    [...slots.children].forEach((el) => el.classList.remove("now"));
    runBtn.textContent = "▶ Start";
  };

  const toggleRun = async () => {
    if (met.running) {
      stopMetronome();
      idleText();
      reportProgress(0, "Stopped. Press Start to try again.");
      return;
    }
    if (!engine.running) {
      try {
        await engine.start();
      } catch {
        setPhase("idle", "Microphone needed", "Allow microphone access so the app can hear your strumming, then press Start again.");
        return;
      }
    }
    dismissFlow();
    onsets = new FluxOnsetDetector(engine.sampleRate); // mic sample rate is known now
    passedEarly = false;
    met.muted = false;
    offsets.length = 0;
    strumsEl.textContent = spreadEl.textContent = "–";
    offsetEl.textContent = "";
    timeBar.style.width = "0%";
    met.start();
    runStart = met.startTime;
    setPhase("countin", `Get ready… ${COUNT_IN_BEATS}`);
    runBtn.textContent = "■ Stop";
    reportProgress(0, "Counting in…");
  };

  const finishRun = () => {
    const { spread, kept } = timing();
    if (kept >= 4) recordScore(`rhythm.${met.bpm}`, Math.round(spread));
    const enough = kept >= PASS.rhythmMinStrums;
    const passed = enough && spread < PASS.rhythmSpreadMs;
    // In a lesson, stop so the click doesn't run under the "next up" panel.
    // In free practice, keep the metronome going.
    if (task) stopMetronome();
    if (passedEarly && !passed) {
      setPhase("done", `Run finished: ±${spread.toFixed(0)} ms`, "You'd already passed this task earlier in the run.");
      reportProgress(1, "Passed earlier in the run");
      if (task) completeTask(task);
    } else if (passed) {
      setPhase("done", `✓ Passed: ±${spread.toFixed(0)} ms (${rating(spread)})`, `${kept} strums on the beat.`);
      reportProgress(1, `Passed with ±${spread.toFixed(0)} ms`);
      if (task) completeTask(task);
    } else if (!enough) {
      setPhase(
        "done",
        `Only ${kept} strums heard on the beat`,
        `The app needs at least ${PASS.rhythmMinStrums}. Strum a little harder or move closer to the mic, and keep going for the full ${PASS.rhythmSeconds} seconds. Press Start to try again.`,
      );
      reportProgress(0, `Not passed: only ${kept} strums heard`);
    } else {
      setPhase(
        "done",
        `Timing ±${spread.toFixed(0)} ms: not quite (need ±${PASS.rhythmSpreadMs})`,
        "Try 10 bpm slower, lock in, then speed back up. Press Start to try again.",
      );
      reportProgress(0, `Not passed: ±${spread.toFixed(0)} ms (need ±${PASS.rhythmSpreadMs})`);
    }
    if (!task) phase = "done";
  };

  root.append(
    h("h1", {}, "Rhythm"),
    h(
      "div",
      { class: "card center" },
      h("div", { class: "row spread" }, h("button", { onclick: () => setBpm(met.bpm - 5) }, "−5"), h("div", {}, bpmLabel, h("div", { class: "small muted" }, "bpm")), h("button", { onclick: () => setBpm(met.bpm + 5) }, "+5")),
      slider,
      chords.length ? h("div", {}, h("div", { class: "small muted" }, "Chords: one bar (4 clicks) each"), h("div", { class: "bar-chords" }, ...chordChips)) : "",
      h("div", { class: "small muted" }, "Strum pattern for each bar (↓ down, ↑ up, · hand moves but misses)"),
      slots,
      h("div", { class: "beats" }, ...beatDots),
      phaseEl,
      detailEl,
      h("div", { class: "progress" }, timeBar),
      h("div", { class: "row", style: "justify-content:center" }, runBtn),
    ),
    h(
      "div",
      { class: "card" },
      h("div", { class: "row spread" }, h("div", {}, h("div", { class: "small muted" }, "Strums heard"), strumsEl), h("div", {}, h("div", { class: "small muted" }, `Timing spread (pass: ±${PASS.rhythmSpreadMs} ms)`), spreadEl)),
      offsetEl,
      h("div", { class: "row" }, h("span", { class: "small muted" }, "Mic"), meter.el),
      h(
        "details",
        { class: "small" },
        h("summary", {}, "How the score works · options"),
        h(
          "p",
          {},
          "The spread is how evenly your strums land around the beat: smaller is steadier. It ignores your device's audio delay, so you don't need to calibrate. Use headphones if you can, otherwise the mic may also hear the click.",
        ),
        h("label", {}, "Pattern ", patternSelect),
        h("p", {}, h("label", {}, countIn, " Count-in only: the click stops after the count-in, to test your inner clock")),
      ),
    ),
  );
  renderPattern();
  highlightBar(0);
  idleText();
  reportProgress(0, "Not started yet. Press Start below.");

  let lastPushMs = 0;
  let passedEarly = false;
  const stop = loop(() => {
    if (!engine.running) return;
    const frame = engine.read(1024);
    const level = rms(frame);
    meter.set(level);
    if ((phase !== "countin" && phase !== "playing") || !met.running) return;
    const nowMs = ctx.currentTime * 1000;
    // Analyse on the audio clock, not the screen's: skip frames where no new
    // audio has arrived (fast displays) so the detector sees a steady hop.
    if (nowMs - lastPushMs < 10) return;
    lastPushMs = nowMs;
    const isOnset = onsets.push(frame, nowMs);
    const elapsed = nowMs - playStartMs();
    if (elapsed > PASS.rhythmSeconds * 1000) {
      // Ends on the clock, so stopping on time still scores.
      finishRun();
      return;
    }
    if (elapsed > 0) {
      const left = Math.ceil(PASS.rhythmSeconds - elapsed / 1000);
      timeBar.style.width = `${(elapsed / 10 / PASS.rhythmSeconds).toFixed(1)}%`;
      if (phase === "playing" && !passedEarly) detailEl.textContent = `${left}s left`;
      const spreadTxt = offsets.length >= 4 ? ` · timing ±${timing().spread.toFixed(0)} ms` : "";
      reportProgress(elapsed / 1000 / PASS.rhythmSeconds, `${left}s left · ${offsets.length} strums${spreadTxt}`);
    }
    if (!isOnset || elapsed < -step() / 2) return; // ignore the count-in bar
    offsets.push(gridOffset(nowMs, runStart * 1000, step()));
    strumsEl.textContent = String(offsets.length);
    const m = mean(offsets);
    offsetEl.textContent = `On average ${Math.abs(m).toFixed(0)} ms ${m >= 0 ? "after" : "before"} the click (includes audio delay).`;
    if (offsets.length >= 4) {
      const t = timing();
      spreadEl.textContent = `±${t.spread.toFixed(0)} ms`;
      spreadEl.classList.toggle("good", t.spread < PASS.rhythmSpreadMs);
      // Enough steady strums already: pass now and offer to move on, while
      // the run carries on for anyone who wants to keep playing.
      if (task && !passedEarly && t.kept >= PASS.rhythmMinStrums && t.spread < PASS.rhythmSpreadMs) {
        passedEarly = true;
        setPhase("playing", `✓ Passed: ±${t.spread.toFixed(0)} ms`, "Keep strumming if you like, or move on.");
        completeTask(task, { stillPlaying: true });
      }
    }
  }, 0);

  return () => {
    stop();
    met.stop();
  };
};
