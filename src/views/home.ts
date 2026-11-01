import { LEVELS, allTasks, lessonTaskHref } from "../lessons/plan";
import { h, type View } from "../ui/dom";
import { progress } from "../ui/storage";

export const homeView: View = (root) => {
  const p = progress.get();
  // Next unfinished task in the first level that has sessions.
  let next: { level: string; session: string; task: string; href: string } | null = null;
  outer: for (const level of LEVELS)
    for (const week of level.weeks)
      for (const s of week.sessions)
        for (const t of s.tasks)
          if (!p[t.id]) {
            next = { level: level.title, session: `${week.title} › ${s.title}`, task: t.title, href: lessonTaskHref(t) ?? `#/lessons/${level.id}` };
            break outer;
          }
  const level1 = LEVELS[0];
  const doneCount = allTasks(level1).filter((t) => p[t.id]).length;

  root.append(
    h(
      "section",
      { class: "hero" },
      h("h1", {}, "Pick the guitar back up."),
      h(
        "p",
        {},
        "Guitar Zero to Hero listens to you play and coaches you from your first chords back to confident playing, then on to intermediate and expert technique.",
      ),
    ),
    next
      ? h(
          "div",
          { class: "card next-up" },
          h("div", { class: "small muted" }, doneCount ? "Continue where you left off" : "Start here"),
          h("h2", {}, next.task),
          h("div", { class: "small muted" }, next.session),
          h("div", { class: "row" }, h("a", { class: "button primary", href: next.href }, "Start"), h("a", { class: "button", href: `#/lessons/${level1.id}` }, "See the plan")),
        )
      : h("div", { class: "card" }, h("h2", {}, "Level 1 complete 🎉"), h("p", {}, "Keep your benchmarks up with the drills while Level 2 sessions are built out.")),
    h(
      "div",
      { class: "tool-grid" },
      tool("#/tuner", "🎯", "Tuner", "Chromatic tuner with string auto-detect."),
      tool("#/drills/check", "✋", "Chord check", "Strum a chord, see if every note rings."),
      tool("#/drills/changes", "⏱", "One-minute changes", "How many clean chord changes in 60s?"),
      tool("#/rhythm", "🥁", "Rhythm", "Metronome, strum patterns and a timing score."),
      tool("#/drills/notes", "🔎", "Find the note", "Learn the fretboard, one note at a time."),
      tool("#/lessons", "📚", "Lesson plans", "From comeback to expert, step by step."),
    ),
  );
  return () => {};
};

function tool(href: string, icon: string, title: string, text: string): HTMLElement {
  return h("a", { class: "card tool", href }, h("div", { class: "tool-icon" }, icon), h("h3", {}, title), h("p", { class: "small muted" }, text));
}
