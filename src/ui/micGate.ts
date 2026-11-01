import { engine } from "../audio/engine";
import { h } from "./dom";

/**
 * Banner that asks for the microphone. Calls `onReady` once listening.
 * Browsers only allow mic access after a click, so we can't auto-start
 * the first time.
 */
export function micGate(onReady: () => void): HTMLElement {
  const status = h("p", { class: "muted" });
  const btn = h(
    "button",
    {
      class: "primary",
      // Only used by Space when the screen has no Start button of its own.
      "data-hotkey": "space-fallback",
      onclick: async () => {
        btn.disabled = true;
        status.textContent = "Waiting for microphone permission…";
        try {
          await engine.start();
          status.textContent = "";
          btn.disabled = false;
        } catch (e) {
          btn.disabled = false;
          const name = (e as DOMException).name;
          status.textContent =
            name === "NotAllowedError"
              ? "Microphone access was blocked. Allow it in your browser's site settings and try again."
              : name === "NotFoundError"
                ? "No microphone found. Plug one in or use your laptop/phone mic."
                : (e as Error).message;
        }
      },
    },
    "🎤 Start listening",
  );
  const gate = h(
    "div",
    { class: "mic-gate card" },
    h("p", {}, "This exercise listens to your guitar through the microphone. Audio never leaves your device."),
    btn,
    status,
  );
  const update = () => {
    gate.hidden = engine.running;
    if (engine.running) onReady();
  };
  const off = engine.onChange(update);
  // Detach the listener when the gate leaves the page.
  const obs = new MutationObserver(() => {
    if (!gate.isConnected) {
      off();
      obs.disconnect();
    }
  });
  queueMicrotask(() => {
    obs.observe(document.body, { childList: true, subtree: true });
    update();
  });
  return gate;
}

/** Live input level bar, handy for checking the mic is picking you up. */
export function levelMeter(): { el: HTMLElement; set: (rms: number) => void } {
  const fill = h("div", { class: "level-fill" });
  const el = h("div", { class: "level", title: "Input level" }, fill);
  return {
    el,
    set: (rms) => {
      const db = 20 * Math.log10(Math.max(rms, 1e-5));
      fill.style.width = `${Math.max(0, Math.min(100, ((db + 60) / 60) * 100))}%`;
    },
  };
}
