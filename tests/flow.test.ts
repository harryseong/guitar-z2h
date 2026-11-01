import { describe, expect, it } from "vitest";
import { LEVELS, lessonTaskHref, locateTask, nextTaskAfter, taskLocations } from "../src/lessons/plan";

describe("lesson flow", () => {
  const all = taskLocations(LEVELS[0]);

  it("walks every task of a level in order", () => {
    for (let i = 0; i < all.length - 1; i++) expect(nextTaskAfter(all[i].task.id)?.task.id).toBe(all[i + 1].task.id);
    expect(nextTaskAfter(all[all.length - 1].task.id)).toBeUndefined();
  });

  it("crosses from the last task of a session into the next session", () => {
    const first = LEVELS[0].weeks[0].sessions[0];
    const last = first.tasks[first.tasks.length - 1];
    expect(nextTaskAfter(last.id)?.session.id).toBe(LEVELS[0].weeks[0].sessions[1].id);
  });

  it("gives every task a launchable link carrying its id", () => {
    for (const { task } of all) {
      expect(lessonTaskHref(task)).toContain(`task=${encodeURIComponent(task.id)}`);
      expect(locateTask(task.id)?.task).toBe(task);
    }
  });
});
