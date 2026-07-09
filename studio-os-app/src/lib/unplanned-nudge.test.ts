import { describe, expect, it } from "vitest";
import { shouldShowUnplannedNudge, unplannedModeTasks } from "./unplanned-nudge";
import { taskOnTodayModeBench } from "./week-focus";
import type { Task } from "./types";

const task = (
  id: string,
  mode: string | null,
  doPlan: Task["doPlan"] = null
): Task => ({
  id,
  title: id,
  lifeAreaId: "music",
  projectId: null,
  workModeId: mode,
  doPlan,
  deadlineInDays: null,
  status: "todo",
  inToday: false,
  completedAtInDays: null,
  parkedAt: 0,
  notes: "",
  subtasks: [],
});

describe("unplannedModeTasks", () => {
  it("returns mode matches not approved and no do-plan this week", () => {
    const tasks = [task("a", "admin"), task("b", "admin")];
    const out = unplannedModeTasks(tasks, "admin", new Set(["a"]), 0);
    expect(out.map((t) => t.id)).toEqual(["b"]);
  });

  it("excludes tasks with do-plan this week", () => {
    const tasks = [task("b", "admin", { kind: "day", offset: 2 })];
    expect(unplannedModeTasks(tasks, "admin", new Set(), 0)).toEqual([]);
  });

  it("returns empty when no approvals yet", () => {
    const tasks = [task("a", "admin")];
    expect(unplannedModeTasks(tasks, "admin", new Set(), 0)).toEqual([]);
  });
});

describe("taskOnTodayModeBench", () => {
  const focus = { kind: "mode" as const, id: "admin" };

  it("includes approved tasks", () => {
    const t = task("a", "admin");
    expect(taskOnTodayModeBench(t, focus, 0, new Set(["a"]))).toBe(true);
  });

  it("includes do-plan this week without approval", () => {
    const t = task("b", "admin", { kind: "day", offset: 1 });
    expect(taskOnTodayModeBench(t, focus, 0, new Set())).toBe(true);
  });

  it("excludes someday tasks without approval", () => {
    const t = task("c", "admin");
    expect(taskOnTodayModeBench(t, focus, 0, new Set(["x"]))).toBe(false);
  });
});

describe("shouldShowUnplannedNudge", () => {
  it("shows when unplanned and never dismissed", () => {
    expect(shouldShowUnplannedNudge(["a", "b"], undefined)).toBe(true);
  });

  it("hides when all ids were in dismiss snapshot", () => {
    expect(shouldShowUnplannedNudge(["a", "b"], ["a", "b"])).toBe(false);
  });

  it("shows when a new unplanned id appears", () => {
    expect(shouldShowUnplannedNudge(["a", "b", "c"], ["a", "b"])).toBe(true);
  });
});
