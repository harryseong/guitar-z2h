import { describe, expect, it } from "vitest";
import { LEVELS, allTasks, goalText } from "../src/lessons/plan";
import { findChord } from "../src/music/chords";

describe("lesson plan", () => {
  it("has unique task ids", () => {
    const ids = LEVELS.flatMap(allTasks).map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("only references chords the app knows", () => {
    for (const t of LEVELS.flatMap(allTasks)) {
      if (t.task.kind === "check" || t.task.kind === "changes" || (t.task.kind === "rhythm" && t.task.chords)) {
        for (const c of t.task.chords ?? []) expect(findChord(c), `${t.title}: ${c}`).toBeDefined();
      }
    }
  });
});

describe("goals", () => {
  it("every task has a goal sentence", () => {
    for (const t of LEVELS.flatMap(allTasks)) expect(goalText(t.task).length).toBeGreaterThan(10);
  });
});
