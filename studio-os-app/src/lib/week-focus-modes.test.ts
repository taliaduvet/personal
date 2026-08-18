import { describe, expect, it } from "vitest";
import {
  dayFocusIncludes,
  dayModeIds,
  focusLabel,
  normalizeDayFocus,
  taskMatchesFocus,
  toggleModeFocus,
} from "./week-focus";
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
