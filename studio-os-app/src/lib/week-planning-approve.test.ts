import { describe, expect, it } from "vitest";
import type { Task } from "./types";
import { weekDaySlots } from "./week-focus";
import { deadlineDotsByDay, modeLoadFromApproved, tasksGroupedByMode } from "./week-planning-approve";

const weekStartsOn = 1 as const; // Monday

function task(partial: Partial<Task> & Pick<Task, "id" | "title">): Task {
  return {
    lifeAreaId: "music",
    projectId: null,
    workModeId: "admin",
    doPlan: null,
    deadlineInDays: null,
    status: "todo",
    inToday: false,
    completedAtInDays: null,
    parkedAt: 0,
    notes: "",
    subtasks: [],
    ...partial,
  };
}

describe("modeLoadFromApproved", () => {
  it("counts approved tasks per work mode, sorted by count descending", () => {
    const a = task({ id: "a", title: "A", workModeId: "admin" });
    const b = task({ id: "b", title: "B", workModeId: "admin" });
    const c = task({ id: "c", title: "C", workModeId: "creative" });
    const d = task({ id: "d", title: "D", workModeId: "creative" });
    const e = task({ id: "e", title: "E", workModeId: "creative" });
    const loads = modeLoadFromApproved([a, b, c, d, e], ["a", "b", "c", "d", "e"]);
    expect(loads.map((l) => l.modeId)).toEqual(["creative", "admin"]);
    expect(loads.map((l) => l.count)).toEqual([3, 2]);
  });

  it("ignores tasks that aren't approved", () => {
    const a = task({ id: "a", title: "A", workModeId: "admin" });
    const b = task({ id: "b", title: "B", workModeId: "admin" });
    const loads = modeLoadFromApproved([a, b], ["a"]);
    expect(loads).toEqual([{ modeId: "admin", name: expect.any(String), count: 1 }]);
  });
});

describe("tasksGroupedByMode", () => {
  it("groups approved tasks by mode and sorts each group's tasks by nearest deadline", () => {
    const soon = task({ id: "soon", title: "Soon", workModeId: "admin", deadlineInDays: 1 });
    const later = task({ id: "later", title: "Later", workModeId: "admin", deadlineInDays: 5 });
    const groups = tasksGroupedByMode([later, soon], ["soon", "later"]);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.modeId).toBe("admin");
    expect(groups[0]!.tasks.map((t) => t.id)).toEqual(["soon", "later"]);
  });

  it("excludes unapproved tasks and tasks without a work mode", () => {
    const approved = task({ id: "a", title: "A", workModeId: "admin" });
    const unapproved = task({ id: "b", title: "B", workModeId: "admin" });
    const noMode = task({ id: "c", title: "C", workModeId: null });
    const groups = tasksGroupedByMode([approved, unapproved, noMode], ["a", "c"]);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.tasks.map((t) => t.id)).toEqual(["a"]);
  });
});

describe("deadlineDotsByDay", () => {
  it("counts approved tasks whose deadline lands on each day, omitting days with none", () => {
    const slots = weekDaySlots(weekStartsOn);
    const target = slots.find((s) => s.offset === 1)!;
    const a = task({ id: "a", title: "A", deadlineInDays: target.offset });
    const b = task({ id: "b", title: "B", deadlineInDays: target.offset });
    const dots = deadlineDotsByDay([a, b], ["a", "b"], slots);
    expect(dots[target.dateKey]).toBe(2);
    expect(Object.keys(dots)).toEqual([target.dateKey]);
  });
});
