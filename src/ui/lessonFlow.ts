import { lessonTaskHref, locateTask, nextTaskAfter, type TaskLocation } from "../lessons/plan";
import { h } from "./dom";
import { progress } from "./storage";

/** Seconds before moving on to the next task in the same session. */
const AUTO_ADVANCE_SECONDS = 5;

let overlay: HTMLElement | null = null;
let countdown = 0;

/** Remove the "next up" panel (called on every route change). */
export function dismissFlow(): void {
  clearInterval(countdown);
  countdown = 0;
  overlay?.remove();
  overlay = null;
}

function go(loc: TaskLocation | undefined, fallback: string): void {
  dismissFlow();
  location.hash = loc ? lessonTaskHref(loc.task) : fallback;
}

function sessionDone(loc: TaskLocation): boolean {
  const p = progress.get();
  return loc.session.tasks.every((t) => p[t.id]);
}

/**
 * Call when a drill launched from a lesson reaches its goal. Marks the task
 * done and shows a panel that moves on to the next task by itself. At the end
 * of a session it shows a summary instead and waits for you.
 */
export function completeTask(id: string | null): void {
  if (!id || overlay) return;
  const here = locateTask(id);
  progress.mark(id);
  document.querySelector(".flow-dot.current")?.classList.add("done");
  if (!here) return;
  const next = nextTaskAfter(id);
  const planHref = `#/lessons/${here.level.id}`;
  const sameSession = next && next.session.id === here.session.id;

  if (sameSession) {
    const label = h("span", {}, `Next now (${AUTO_ADVANCE_SECONDS})`);
    const stay = h("button", { onclick: () => dismissFlow() }, "Stay here");
    overlay = h(
      "div",
      { class: "flow-sheet", role: "status" },
      h("div", { class: "flow-done" }, "✓ ", here.task.title),
      h("div", { class: "small muted" }, "Next up · ", `${next.index + 1} of ${here.session.tasks.length}`),
      h("div", { class: "flow-next" }, next.task.title),
      h("div", { class: "row" }, h("button", { class: "primary", onclick: () => go(next, planHref) }, label), stay),
    );
    let left = AUTO_ADVANCE_SECONDS;
    countdown = window.setInterval(() => {
      left--;
      label.textContent = `Next now (${left})`;
      if (left <= 0) go(next, planHref);
    }, 1000);
  } else {
    const allDone = sessionDone(here);
    overlay = h(
      "div",
      { class: "flow-sheet session-end", role: "status" },
      h("div", { class: "flow-done" }, "🎉 ", here.session.title, allDone ? " complete" : " finished"),
      h(
        "div",
        { class: "small muted" },
        allDone ? "Nice work. Rest your hands for a bit; little and often beats one long session." : "Some tasks in this session aren't ticked yet. You can go back to them from the plan.",
      ),
      next
        ? h("div", {}, h("div", { class: "small muted" }, "Next session"), h("div", { class: "flow-next" }, `${next.week.title.split(" · ")[0]} › ${next.session.title}`))
        : h("div", { class: "flow-next" }, `That's the end of ${here.level.title}!`),
      h(
        "div",
        { class: "row" },
        next ? h("button", { class: "primary", onclick: () => go(next, planHref) }, "Start next session") : "",
        h("button", { onclick: () => go(undefined, planHref) }, "Back to the plan"),
        h("button", { onclick: () => dismissFlow() }, "Keep practising"),
      ),
    );
  }
  document.body.append(overlay);
}

/** Strip at the top of a drill opened from a lesson: where you are, plus skip / done controls. */
export function lessonBar(id: string): HTMLElement | null {
  const here = locateTask(id);
  if (!here) return null;
  const next = nextTaskAfter(id);
  const total = here.session.tasks.length;
  const dots = here.session.tasks.map((t, i) =>
    h("span", { class: `flow-dot${progress.get()[t.id] ? " done" : ""}${i === here.index ? " current" : ""}`, title: t.title }),
  );
  return h(
    "div",
    { class: "lesson-bar" },
    h(
      "div",
      { class: "lesson-bar-top" },
      h("a", { href: `#/lessons/${here.level.id}`, class: "small" }, "← Plan"),
      h("span", { class: "small muted" }, `${here.session.title} · task ${here.index + 1} of ${total}`),
    ),
    h("div", { class: "lesson-bar-task" }, here.task.title),
    h("div", { class: "small muted" }, here.task.detail),
    h(
      "div",
      { class: "row lesson-bar-actions" },
      h("div", { class: "flow-dots" }, ...dots),
      h("button", { class: "small-btn", onclick: () => completeTask(id) }, "Mark done"),
      next ? h("button", { class: "small-btn", onclick: () => go(next, `#/lessons/${here.level.id}`) }, "Skip →") : "",
    ),
  );
}
