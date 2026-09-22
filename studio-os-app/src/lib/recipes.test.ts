import { describe, expect, it } from "vitest";
import { applyRecipeMilestones, deadlineInDaysForMilestone, shiftRecipeTasks } from "./recipes";
import type { Recipe, RecipeMilestone, Task } from "./types";

describe("deadlineInDaysForMilestone", () => {
  it("computes days until anchor + offset", () => {
    const now = new Date("2026-07-09T12:00:00");
    expect(deadlineInDaysForMilestone("2026-07-16", 0, now)).toBe(7);
    expect(deadlineInDaysForMilestone("2026-07-16", -7, now)).toBe(0);
  });
});

describe("shiftRecipeTasks", () => {
  it("updates linked task deadlines when anchor moves", () => {
    const now = new Date("2026-07-09T12:00:00");
    const before = deadlineInDaysForMilestone("2026-07-20", 0, now);
    const recipe: Recipe = {
      id: "r1",
      name: "EP",
      projectId: "p1",
      lifeAreaId: "music",
      anchorDate: "2026-07-20",
      milestones: [{ id: "m1", title: "Release", offsetDays: 0, workModeId: null }],
      createdAt: 1,
    };
    const tasks: Task[] = [
      {
        id: "t1",
        title: "Release",
        lifeAreaId: "music",
        projectId: "p1",
        workModeId: null,
        doPlan: null,
        deadlineInDays: before,
        status: "todo",
        inToday: false,
        completedAtInDays: null,
        parkedAt: 1,
        notes: "",
        subtasks: [],
        recipeId: "r1",
        milestoneId: "m1",
      },
    ];
    const shifted = shiftRecipeTasks(
      { ...recipe, anchorDate: "2026-07-27" },
      tasks,
      now
    );
    const after = deadlineInDaysForMilestone("2026-07-27", 0, now);
    expect(shifted[0]?.deadlineInDays).toBe(after);
    expect(after).toBeGreaterThan(before);
  });
});

describe("applyRecipeMilestones", () => {
  const recipe: Recipe = {
    id: "r1",
    name: "EP",
    projectId: "p1",
    lifeAreaId: "music",
    anchorDate: "2026-07-20",
    milestones: [{ id: "m1", title: "Release", offsetDays: 0, workModeId: null }],
    createdAt: 1,
  };

  function baseTask(overrides: Partial<Task> = {}): Task {
    return {
      id: "t1",
      title: "Release",
      lifeAreaId: "music",
      projectId: "p1",
      workModeId: null,
      doPlan: null,
      deadlineInDays: 99,
      status: "todo",
      inToday: false,
      completedAtInDays: null,
      parkedAt: 1,
      notes: "",
      subtasks: [],
      recipeId: "r1",
      milestoneId: "m1",
      ...overrides,
    };
  }

  const createTask = (milestone: RecipeMilestone): Task =>
    baseTask({ id: "new", milestoneId: milestone.id, deadlineInDays: null });

  it("clears a stale deadlineDateKey on an existing linked task so the recomputed offset wins", () => {
    // Simulates a task whose deadline was manually edited at some point (setting
    // an absolute deadlineDateKey) before the recipe is reapplied.
    const tasks = [baseTask({ deadlineDateKey: "2099-01-01" })];
    const { nextTasks } = applyRecipeMilestones(recipe, tasks, createTask);
    expect(nextTasks[0]?.deadlineDateKey).toBeNull();
    expect(nextTasks[0]?.deadlineInDays).not.toBe(99);
  });

  it("leaves deadlineDateKey null for a newly created milestone task", () => {
    const { created } = applyRecipeMilestones(recipe, [], createTask);
    expect(created[0]?.deadlineDateKey ?? null).toBeNull();
  });
});
