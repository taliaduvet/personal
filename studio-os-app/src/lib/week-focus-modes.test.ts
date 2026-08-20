import { describe, expect, it } from "vitest";
import {
  dayFocusIncludes,
  dayModeIds,
  focusLabel,
  normalizeDayFocus,
  partitionInTodayByFocus,
  taskHasArrivedToday,
  taskMatchesFocus,
  toggleModeFocus,
} from "./week-focus";
import { dayPlan } from "./do-plan";
import type { Task } from "./types";

function task(partial: Partial<Task> & Pick<Task, "id" | "title">): Task {
  return {
    lifeAreaId: "music",
    projectId: null,
    workModeId: null,
    doPlan: null,
    deadlineInDays: null,
    status: "todo",
    inToday: false,
    completedAtInDays: null,
    parkedAt: Date.now(),
    notes: "",
    subtasks: [],
    ...partial,
  };
}

describe("multi-mode day focus", () => {
  it("normalizes legacy single mode", () => {
    expect(normalizeDayFocus({ kind: "mode", id: "admin" })).toEqual({
      kind: "modes",
      ids: ["admin"],
    });
  });

  it("toggles modes on and off", () => {
    const one = toggleModeFocus(null, "admin");
    expect(one).toEqual({ kind: "modes", ids: ["admin"] });
    const two = toggleModeFocus(one, "outreach");
    expect(dayModeIds(two).sort()).toEqual(["admin", "outreach"]);
    const back = toggleModeFocus(two, "admin");
    expect(back).toEqual({ kind: "modes", ids: ["outreach"] });
    expect(toggleModeFocus(back, "outreach")).toBeNull();
  });

  it("matches tasks against any selected mode", () => {
    const focus = { kind: "modes" as const, ids: ["admin", "outreach"] };
    expect(taskMatchesFocus(task({ id: "a", title: "A", workModeId: "admin" }), focus)).toBe(true);
    expect(taskMatchesFocus(task({ id: "b", title: "B", workModeId: "outreach" }), focus)).toBe(true);
    expect(taskMatchesFocus(task({ id: "c", title: "C", workModeId: "creative" }), focus)).toBe(false);
  });

  it("stacks two sequential stamps like week planning", () => {
    let focus = toggleModeFocus(null, "admin");
    focus = toggleModeFocus(focus, "outreach");
    expect(dayModeIds(focus).sort()).toEqual(["admin", "outreach"]);
    expect(focusLabel(focus)).toMatch(/Admin/);
    expect(focusLabel(focus)).toMatch(/Outreach/);
  });
});

describe("today's arrivals break through a mismatched day mode", () => {
  it("taskHasArrivedToday is true for a Doing: Today plan, a today/overdue deadline, false otherwise", () => {
    expect(taskHasArrivedToday(task({ id: "a", title: "A", doPlan: dayPlan(0) }))).toBe(true);
    expect(taskHasArrivedToday(task({ id: "b", title: "B", doPlan: dayPlan(-2) }))).toBe(true);
    expect(taskHasArrivedToday(task({ id: "c", title: "C", deadlineInDays: 0 }))).toBe(true);
    expect(taskHasArrivedToday(task({ id: "d", title: "D", deadlineInDays: -1 }))).toBe(true);
    expect(taskHasArrivedToday(task({ id: "e", title: "E", doPlan: dayPlan(1) }))).toBe(false);
    expect(taskHasArrivedToday(task({ id: "f", title: "F", deadlineInDays: 2 }))).toBe(false);
    expect(taskHasArrivedToday(task({ id: "g", title: "G" }))).toBe(false);
  });

  it("surfaces a today-deadline task in 'also today' even when it's in another mode and never added to Today", () => {
    const focus = { kind: "modes" as const, ids: ["creative"] };
    const errand = task({
      id: "errand",
      title: "Book dentist",
      workModeId: "errands",
      deadlineInDays: 0,
      inToday: false,
    });
    const { outsideFocus } = partitionInTodayByFocus([errand], focus);
    expect(outsideFocus.map((t) => t.id)).toEqual(["errand"]);
  });

  it("still respects an explicit Today-bench Defer for that day", () => {
    const focus = { kind: "modes" as const, ids: ["creative"] };
    const errand = task({
      id: "errand",
      title: "Book dentist",
      workModeId: "errands",
      deadlineInDays: 0,
      inToday: false,
    });
    const { outsideFocus } = partitionInTodayByFocus([errand], focus, new Set(["errand"]));
    expect(outsideFocus).toEqual([]);
  });
});
