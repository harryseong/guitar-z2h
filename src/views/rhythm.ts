import { engine, loop } from "../audio/engine";
import { Metronome } from "../audio/metronome";
import { OnsetDetector, gridOffset, mean, stdDev } from "../audio/onset";
import { rms } from "../audio/pitch";
import { h, type View } from "../ui/dom";
import { levelMeter, micGate } from "../ui/micGate";
import { completeTask } from "../ui/lessonFlow";
import { recordScore } from "../ui/storage";

/** Eighth-note slots for one bar: "D", "U" or "" (hand moves but misses). */
const PATTERNS: Record<string, string[]> = {
  "1 2 3 4": ["1", "", "2", "", "3", "", "4", ""],
  "D D D D": ["D", "", "D", "", "D", "", "D", ""],
  "D DU D DU": ["D", "", "D", "U", "D", "", "D", "U"],
  "D DU UDU": ["D", "", "D", "U", "", "U", "D", "U"],
  "DU DU DU DU": ["D", "U", "D", "U", "D", "U", "D", "U"],
};
const COUNTS = ["1", "&", "2", "&", "3", "&", "4", "&"];
const RUN_SECONDS = 30;

function rating(spread: number): string {
  if (spread < 15) return "Rock solid";
  if (spread < 25) return "Tight";
  if (spread < 40) return "Good";
  if (spread < 60) return "Getting there";
  return "Loose: slow the tempo down";
}

export const rhythmView: View = (root, params) => {
  const ctx = engine.output();
  const met = new Metronome(ctx);
  met.bpm = Math.min(200, Math.max(40, Number(params.get("bpm")) || 70));
  let patternKey = params.get("pattern") ?? "D DU D DU";
  if (!PATTERNS[patternKey]) patternKey = "D DU D DU";
  const task = params.get("task");
  let countInOnly = false;

  const onsets = new OnsetDetector();
  const offsets: number[] = [];
  let listening = false;
  let runStart = 0;
  const meter = levelMeter();

  const bpmLabel = h("span", { class: "bpm" }, String(met.bpm));
  const slider = h("input", { type: "range", min: 40, max: 200, value: met.bpm }) as HTMLInputElement;
  slider.addEventListener("input", () => {
    met.bpm = Number(slider.value);
    bpmLabel.textContent = slider.value;
  });
  const nudge = (d: number) => () => {
    met.bpm = Math.min(200, Math.max(40, met.bpm + d));
    slider.value = String(met.bpm);
    bpmLabel.textContent = String(met.bpm);
  };

  const slots = h("div", { class: "pattern" });
  const renderPattern = () =>
    slots.replaceChildren(
      ...PATTERNS[patternKey].map((s, i) =>
        h("div", { class: `slot${s ? "" : " ghost"}` }, h("div", { class: "stroke" }, s || "·"), h("div", { class: "count" }, COUNTS[i])),
      ),
    );
  const patternSelect = h(
    "select",
    {},
    ...Object.keys(PATTERNS).map((k) => h("option", { value: k, selected: k === patternKey }, k === "1 2 3 4" ? "Quarter notes (warm-up)" : k)),
  ) as HTMLSelectElement;
  patternSelect.addEventListener("change", () => {
    patternKey = patternSelect.value;
    renderPattern();
  });

  const beatDots = Array.from({ length: 4 }, () => h("div", { class: "beat-dot" }));
  met.onBeat = (beat) => {
    beatDots.forEach((d, i) => d.classList.toggle("on", i === beat % 4));
    if (countInOnly && beat === 3) met.muted = true;
  };

  const offsetEl = h("div", { class: "big-stat" }, "–");
  const spreadEl = h("div", { class: "big-stat" }, "–");
  const verdict = h("div", { class: "status" });
  const runBtn = h("button", { class: "primary", onclick: () => toggleRun() }, "Start metronome");
  const countIn = h("input", { type: "checkbox" }) as HTMLInputElement;
  countIn.addEventListener("change", () => (countInOnly = countIn.checked));

  const step = () => {
    const hasUp = PATTERNS[patternKey].some((s) => s === "U");
    return ((60 / met.bpm) * 1000) / (hasUp ? 2 : 1);
  };

  const toggleRun = () => {
    if (met.running) {
      met.stop();
      listening = false;
      runBtn.textContent = "Start metronome";
      return;
    }
    met.muted = false;
    offsets.length = 0;
    offsetEl.textContent = spreadEl.textContent = "–";
    verdict.textContent = engine.running ? `Play along. Scoring the first ${RUN_SECONDS} seconds after the first bar.` : "";
    met.start();
    runStart = met.startTime;
    listening = engine.running;
    runBtn.textContent = "Stop";
  };

  root.append(
    h("h1", {}, "Rhythm"),
    h(
      "div",
      { class: "card" },
      h("div", { class: "row spread" }, h("button", { onclick: nudge(-5) }, "−5"), h("div", { class: "center" }, bpmLabel, h("div", { class: "small muted" }, "bpm")), h("button", { onclick: nudge(5) }, "+5")),
      slider,
      h("div", { class: "beats" }, ...beatDots),
      h("div", { class: "row" }, h("label", { class: "small" }, "Pattern ", patternSelect)),
      slots,
      h("div", { class: "row" }, runBtn, h("label", { class: "small" }, countIn, " Count-in only (tests your inner clock)")),
    ),
    h("h2", {}, "Timing check"),
    micGate(() => {}),
    h(
      "div",
      { class: "card" },
      h("div", { class: "row spread" }, h("div", {}, h("div", { class: "small muted" }, "Average offset"), offsetEl), h("div", {}, h("div", { class: "small muted" }, "Consistency (spread)"), spreadEl)),
      verdict,
      h("div", { class: "row" }, h("span", { class: "small muted" }, "Input"), meter.el),
      h(
        "p",
        { class: "muted small" },
        "Use headphones for the click, otherwise the mic hears the metronome. The average offset includes your device's audio latency, so watch the spread: it measures how evenly you play, and that is what matters.",
      ),
    ),
  );
  renderPattern();

  const stop = loop(() => {
    if (!engine.running) return;
    const frame = engine.read(1024);
    const level = rms(frame);
    meter.set(level);
    if (!listening || !met.running) return;
    const nowMs = ctx.currentTime * 1000;
    if (!onsets.push(level, nowMs)) return;
    const beatMs = (60 / met.bpm) * 1000;
    const start = runStart * 1000;
    if (nowMs < start + beatMs * 4 - step() / 2) return; // ignore the count-in bar
    if (nowMs > start + beatMs * 4 + RUN_SECONDS * 1000) {
      if (listening) {
        listening = false;
        const spread = stdDev(offsets);
        recordScore(`rhythm.${met.bpm}`, Math.round(spread));
        if (task && offsets.length >= 16 && spread < 40) completeTask(task);
        verdict.textContent = `${offsets.length} strums scored. ${rating(spread)}.`;
      }
      return;
    }
    offsets.push(gridOffset(nowMs, start, step()));
    const m = mean(offsets);
    offsetEl.textContent = `${m > 0 ? "+" : ""}${m.toFixed(0)} ms ${m > 8 ? "(late)" : m < -8 ? "(early)" : ""}`;
    if (offsets.length >= 4) {
      const s = stdDev(offsets);
      spreadEl.textContent = `±${s.toFixed(0)} ms`;
      verdict.textContent = rating(s);
    }
  }, 0);

  return () => {
    stop();
    met.stop();
  };
};
