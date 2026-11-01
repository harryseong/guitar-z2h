import "./style.css";
import { engine } from "./audio/engine";
import { h, type View } from "./ui/dom";
import { dismissFlow, lessonBar } from "./ui/lessonFlow";
import { chordCheckView, changesView, notesView } from "./views/drills";
import { homeView } from "./views/home";
import { levelView, lessonsView } from "./views/lessons";
import { practiceView } from "./views/practice";
import { rhythmView } from "./views/rhythm";
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
  cleanup = (view ?? homeView)(main, params);
  const task = params.get("task");
  const bar = task ? lessonBar(task) : null;
  if (bar) main.prepend(bar);
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

window.addEventListener("hashchange", route);
route();
