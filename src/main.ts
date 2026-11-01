import "./style.css";
import { engine } from "./audio/engine";
import { h, type View } from "./ui/dom";
import { dismissFlow, lessonBar } from "./ui/lessonFlow";
import { chordCheckView, changesView, notesView } from "./views/drills";
import { homeView } from "./views/home";
import { levelView, lessonsView } from "./views/lessons";
import { practiceView } from "./views/practice";
import { rhythmView } from "./views/rhythm";
import { warmupView } from "./views/warmup";
import { tunerView } from "./views/tuner";

const routes: Record<string, View> = {
  "": homeView,
  tuner: tunerView,
  drills: chordCheckView,
  "drills/check": chordCheckView,
  "drills/changes": changesView,
  "drills/notes": notesView,
  rhythm: rhythmView,
  practice: practiceView,
  warmup: warmupView,
  lessons: lessonsView,
};

const main = document.getElementById("app")!;
let cleanup: () => void = () => {};

function route(): void {
  const [path, query = ""] = location.hash.replace(/^#\/?/, "").split("?");
  const params = new URLSearchParams(query);
  let view = routes[path];
  const m = path.match(/^lessons\/([\w-]+)$/);
  if (m) {
    params.set("id", m[1]);
    view = levelView;
  }
  cleanup();
  dismissFlow();
  main.replaceChildren();
  // The lesson bar goes in first so views can report progress into it while rendering.
  const task = params.get("task");
  const bar = task ? lessonBar(task) : null;
  if (bar) main.append(bar);
  cleanup = (view ?? homeView)(main, params);
  document.querySelectorAll<HTMLAnchorElement>(".nav a").forEach((a) => {
    const target = a.getAttribute("href")!.replace(/^#\/?/, "");
    a.classList.toggle("active", target === "" ? path === "" : path.startsWith(target));
  });
  window.scrollTo(0, 0);
}

const micIndicator = h("button", { class: "mic-indicator", title: "Stop listening", onclick: () => engine.stop() }, "● Listening");
const updateMic = () => (micIndicator.hidden = !engine.running);
engine.onChange(updateMic);
updateMic();
document.querySelector(".topbar")!.append(micIndicator);

/**
 * Space presses the screen's main button: Start / Stop on a drill, "Start
 * listening", or "Next" when the next-up panel is showing. Lets you keep both
 * hands on the guitar and tap the space bar.
 */
function hotkeyTarget(): HTMLButtonElement | undefined {
  const visible = (b: HTMLButtonElement) => !b.disabled && b.getClientRects().length > 0;
  const inPanel = [...document.querySelectorAll<HTMLButtonElement>(".flow-sheet [data-hotkey=space]")].filter(visible);
  if (inPanel.length) return inPanel[0];
  return (
    [...main.querySelectorAll<HTMLButtonElement>("[data-hotkey=space]")].filter(visible)[0] ??
    [...main.querySelectorAll<HTMLButtonElement>("[data-hotkey=space-fallback]")].filter(visible)[0]
  );
}
const isSpace = (e: KeyboardEvent) => e.code === "Space" && !e.ctrlKey && !e.metaKey && !e.altKey;
const typing = (e: KeyboardEvent) => (e.target as HTMLElement).closest?.("input, select, textarea, [contenteditable]") !== null;
document.addEventListener("keydown", (e) => {
  if (!isSpace(e) || typing(e)) return;
  e.preventDefault(); // no page scroll, and no double-press of a focused button
  if (e.repeat) return;
  hotkeyTarget()?.click();
});
document.addEventListener("keyup", (e) => {
  // Browsers press a focused button on Space keyup; we've already handled it.
  if (isSpace(e) && !typing(e)) e.preventDefault();
});

window.addEventListener("hashchange", route);
route();
