import { LEVELS, allTasks, goalText, lessonTaskHref, type Level, type Session } from "../lessons/plan";
import { h, type View } from "../ui/dom";
import { progress } from "../ui/storage";

function levelProgress(level: Level): { done: number; total: number } {
  const p = progress.get();
  const tasks = allTasks(level);
  return { done: tasks.filter((t) => p[t.id]).length, total: tasks.length };
}

function progressBar(done: number, total: number): HTMLElement {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return h(
    "div",
    { class: "progress", role: "progressbar", "aria-valuenow": pct, "aria-valuemin": 0, "aria-valuemax": 100 },
    h("div", { class: "progress-fill", style: `width:${pct}%` }),
  );
}

export const lessonsView: View = (root) => {
  root.append(
    h("h1", {}, "Lesson plans"),
    h(
      "p",
      { class: "muted" },
      "Work through the levels in order. Each session is 20 to 30 minutes; aim for 4 or 5 sessions a week. Short and often beats long and rare.",
    ),
    ...LEVELS.map((level) => {
      const { done, total } = levelProgress(level);
      const ready = level.weeks.length > 0;
      return h(
        "a",
        { class: `card level-card${ready ? "" : " locked"}`, href: `#/lessons/${level.id}` },
        h("h2", {}, level.title),
        h("p", {}, level.tagline),
        ready
          ? h("div", {}, progressBar(done, total), h("div", { class: "small muted" }, `${done} of ${total} tasks done`))
          : h("div", { class: "small muted" }, "Outline only: full sessions are coming next"),
      );
    }),
  );
  return () => {};
};

function sessionEl(session: Session): HTMLElement {
  const p = progress.get();
  const done = session.tasks.filter((t) => p[t.id]).length;
  const minutes = session.tasks.reduce((a, t) => a + t.minutes, 0);
  return h(
    "details",
    { class: "card session", open: done < session.tasks.length && done > 0 },
    h(
      "summary",
      {},
      h("span", {}, session.title),
      h("span", { class: "small muted" }, ` · ~${minutes} min · ${done}/${session.tasks.length}`),
    ),
    h(
      "ol",
      { class: "tasks" },
      ...session.tasks.map((t) => {
        const box = h("input", { type: "checkbox", checked: Boolean(p[t.id]), "aria-label": `Mark "${t.title}" done` }) as HTMLInputElement;
        box.addEventListener("change", () => {
          progress.toggle(t.id);
        });
        const href = lessonTaskHref(t);
        return h(
          "li",
          { class: "task" },
          box,
          h(
            "div",
            { class: "task-body" },
            h("div", { class: "task-title" }, t.title, h("span", { class: "small muted" }, ` · ${t.minutes} min`)),
            h("div", { class: "small task-goal" }, h("span", { class: "goal-label" }, "Goal"), goalText(t.task)),
            h("div", { class: "small muted" }, t.detail),
          ),
          h("a", { class: "button", href }, "Start"),
        );
      }),
    ),
  );
}

export const levelView: View = (root, params) => {
  const level = LEVELS.find((l) => l.id === params.get("id")) ?? LEVELS[0];
  const { done, total } = levelProgress(level);
  root.append(
    h("a", { href: "#/lessons", class: "small" }, "← All levels"),
    h("h1", {}, level.title),
    h("p", {}, level.tagline),
    total ? h("div", {}, progressBar(done, total), h("div", { class: "small muted" }, `${done} of ${total} tasks done`)) : "",
    h("div", { class: "card" }, h("h3", {}, "By the end of this level you'll be able to"), h("ul", {}, ...level.goals.map((g) => h("li", {}, g)))),
    ...level.weeks.map((w) =>
      h("section", { class: "week" }, h("h2", {}, w.title), h("p", { class: "muted" }, w.focus), ...w.sessions.map(sessionEl)),
    ),
    level.milestones
      ? h(
          "div",
          { class: "card" },
          h("h3", {}, "What this level covers"),
          h("ul", {}, ...level.milestones.map((m) => h("li", {}, m))),
          h("p", { class: "muted small" }, "Detailed sessions for this level will be added as you get through Level 1."),
        )
      : "",
    h(
      "p",
      { class: "muted small" },
      "Press Start on any task and the app walks you through the rest of the session, moving on by itself as you hit each goal. You can also tick tasks by hand.",
    ),
  );
  return () => {};
};
