import { engine, loop } from "../audio/engine";
import { detectPitch, rms } from "../audio/pitch";
import { STANDARD_TUNING, freqToMidi, midiToFreq, nearestString, noteFromFreq } from "../music/notes";
import { h, type View } from "../ui/dom";
import { levelMeter, micGate } from "../ui/micGate";
import { completeTask } from "../ui/lessonFlow";
import { load, save } from "../ui/storage";

const IN_TUNE_CENTS = 5;

export const tunerView: View = (root, params) => {
  const task = params.get("task");
  let a4 = load("a4", 440);
  let target: number | "auto" = "auto";
  const recent: number[] = [];
  const tuned = new Set<number>();

  const noteEl = h("div", { class: "tuner-note" }, "–");
  const freqEl = h("div", { class: "muted tuner-freq" }, "Pluck a string");
  const needle = h("div", { class: "needle" });
  const centsEl = h("div", { class: "tuner-cents" }, "");
  const hint = h("div", { class: "tuner-hint" }, "");
  const meter = levelMeter();

  const stringBtns = STANDARD_TUNING.map((s, i) =>
    h(
      "button",
      {
        class: "string-btn",
        onclick: () => {
          target = target === i ? "auto" : i;
          renderButtons();
        },
      },
      h("span", { class: "string-num" }, String(s.number)),
      s.label.replace(/\d/, ""),
    ),
  );
  const renderButtons = () =>
    stringBtns.forEach((b, i) => {
      b.classList.toggle("selected", target === i);
      b.classList.toggle("done", tuned.has(i));
    });

  const a4Input = h("input", { type: "number", min: 415, max: 466, value: a4, class: "a4" }) as HTMLInputElement;
  a4Input.addEventListener("change", () => {
    a4 = Math.min(466, Math.max(415, Number(a4Input.value) || 440));
    a4Input.value = String(a4);
    save("a4", a4);
  });

  root.append(
    h("h1", {}, "Tuner"),
    micGate(() => {}),
    h(
      "div",
      { class: "card tuner" },
      noteEl,
      freqEl,
      h("div", { class: "gauge" }, h("div", { class: "gauge-zone" }), needle, h("div", { class: "gauge-ticks" })),
      centsEl,
      hint,
      h("div", { class: "strings" }, ...stringBtns),
      h("p", { class: "muted small" }, "Auto mode picks the nearest string. Tap a string to lock onto it, tap again for auto."),
      h("div", { class: "row" }, meter.el, h("label", { class: "small muted" }, "A4 = ", a4Input, " Hz")),
    ),
    h(
      "details",
      { class: "card" },
      h("summary", {}, "Tips for a guitar that hasn't been played in a while"),
      h(
        "ul",
        {},
        h("li", {}, "Old strings go dull and won't hold tune. If yours are years old, a fresh set is the best £/$ you'll spend."),
        h("li", {}, "Always tune up to the note: if you're sharp, drop below and come back up. The gear holds better."),
        h("li", {}, "New strings stretch: retune a few times in the first sessions."),
        h("li", {}, "Pluck with medium force and let the note ring; the first instant of a pluck is always a bit sharp."),
      ),
    ),
  );
  renderButtons();

  const stop = loop(() => {
    if (!engine.running) return;
    const buf = engine.read(4096);
    meter.set(rms(buf));
    const p = detectPitch(buf, engine.sampleRate);
    if (!p || p.clarity < 0.85) {
      if (recent.length) recent.shift();
      if (!recent.length) noteEl.classList.add("stale");
      return;
    }
    recent.push(p.freq);
    if (recent.length > 5) recent.shift();
    const freq = [...recent].sort((a, b) => a - b)[Math.floor(recent.length / 2)];
    noteEl.classList.remove("stale");

    let cents: number;
    let label: string;
    let idx: number;
    if (target === "auto") {
      const ns = nearestString(freq, a4);
      idx = ns.index;
      cents = ns.cents;
      label = STANDARD_TUNING[idx].label;
      // Far from any open string: behave like a chromatic tuner.
      if (Math.abs(cents) > 150) {
        const n = noteFromFreq(freq, a4);
        cents = n.cents;
        label = `${n.name}${n.octave}`;
        idx = -1;
      }
    } else {
      idx = target;
      cents = (freqToMidi(freq, a4) - STANDARD_TUNING[idx].midi) * 100;
      label = STANDARD_TUNING[idx].label;
    }

    noteEl.textContent = label.replace(/\d/, "");
    freqEl.textContent = `${freq.toFixed(1)} Hz${idx >= 0 ? ` · target ${midiToFreq(STANDARD_TUNING[idx].midi, a4).toFixed(1)} Hz` : ""}`;
    const clamped = Math.max(-50, Math.min(50, cents));
    needle.style.left = `${50 + clamped}%`;
    const inTune = Math.abs(cents) <= IN_TUNE_CENTS;
    needle.classList.toggle("ok", inTune);
    noteEl.classList.toggle("ok", inTune);
    centsEl.textContent = `${cents > 0 ? "+" : ""}${cents.toFixed(0)} cents`;
    if (Math.abs(cents) > 100) hint.textContent = cents > 0 ? "Way sharp: loosen a lot" : "Way flat: tighten a lot";
    else if (inTune) hint.textContent = "In tune ✓";
    else hint.textContent = cents > 0 ? "Sharp: loosen slightly" : "Flat: tighten slightly";
    if (inTune && idx >= 0 && !tuned.has(idx)) {
      tuned.add(idx);
      renderButtons();
      if (task && tuned.size === STANDARD_TUNING.length) completeTask(task);
    }
  }, 50);

  return stop;
};
