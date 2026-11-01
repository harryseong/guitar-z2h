import { locateTask } from "../lessons/plan";
import { h, type View } from "../ui/dom";
import { completeTask, reportProgress } from "../ui/lessonFlow";

/** Timer page for lesson tasks done away from the app (a song, barre holds…). */
export const practiceView: View = (root, params) => {
  const id = params.get("task");
  const loc = id ? locateTask(id) : undefined;
  const total = (loc?.task.minutes ?? 5) * 60;
  let left = total;
  let timer = 0;

  const clock = h("div", { class: "timer" });
  const toggle = h("button", { class: "primary", "data-hotkey": "space", onclick: () => (timer ? pause() : start()) }, "Start timer");
  const render = () => {
    const t = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
    clock.textContent = t;
    reportProgress(1 - left / total, left === total ? "Press Start timer when you begin" : `${t} left`);
  };
  const pause = () => {
    clearInterval(timer);
    timer = 0;
    toggle.textContent = "Resume";
  };
  const start = () => {
    toggle.textContent = "Pause";
    timer = window.setInterval(() => {
      left--;
      render();
      if (left <= 0) {
        pause();
        toggle.textContent = "Start timer";
        left = total;
        completeTask(id);
      }
    }, 1000);
  };

  root.append(
    h("h1", {}, "Practice"),
    h(
      "div",
      { class: "card center" },
      h("p", {}, "This one happens away from the screen. Read the steps above, press Start timer, and play. When the timer ends you'll move on to the next step, or press I'm done if you finish early."),
      clock,
      h("div", { class: "row", style: "justify-content:center" }, toggle, h("button", { onclick: () => completeTask(id) }, "I'm done")),
    ),
  );
  render();
  return () => clearInterval(timer);
};
