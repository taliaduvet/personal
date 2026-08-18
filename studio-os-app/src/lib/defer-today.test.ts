import { describe, expect, it } from "vitest";
import { planDeferToday, withDeferredTaskId } from "./defer-today";
import type { Task } from "./types";
import {
  emptyWeekFocusDraft,
  nextMatchingFocusDayOffset,
  resurfaceFocusForTask,
  taskOnTodayModeBench,
  weekDaySlots,
  type WeekFocusDraft,
} from "./week-focus";

const weekStartsOn = 1 as const; // Monday

function task(partial: Partial<Task> & Pick<Task, "id" | "title">): Task {
  return {
    lifeAreaId: "music",
    projectId: null,
    workModeId: "creative",
    doPlan: null,
    deadlineInDays: null,
    status: "todo",
    inToday: true,
    completedAtInDays: null,
    parkedAt: 0,
    notes: "",
    subtasks: [],
    ...partial,
  };
}

function draftWithModes(modeByOffset: Record<number, string>): WeekFocusDraft {
  const slots = weekDaySlots(weekStartsOn);
  const draft = emptyWeekFocusDraft(slots);
  for (const slot of slots) {
    const modeId = modeByOffset[slot.offset];
    if (modeId) {
      draft.days[slot.dateKey] = { focus: { kind: "mode", id: modeId }, note: "" };
    }
  }
  return draft;
}

describe("nextMatchingFocusDayOffset", () => {
  it("finds the next day with the same mode", () => {
    const slots = weekDaySlots(weekStartsOn);
    const future = slots.filter((s) => s.offset > 0);
    expect(future.length).toBeGreaterThan(0);
    const target = future[future.length - 1]!;
    const mid = future[0]!;
    const draft = emptyWeekFocusDraft(slots);
    const todayKey = slots.find((s) => s.isToday)!.dateKey;
    draft.days[todayKey] = { focus: { kind: "mode", id: "creative" }, note: "" };
    if (mid.dateKey !== target.dateKey) {
      draft.days[mid.dateKey] = { focus: { kind: "mode", id: "admin" }, note: "" };
    }
    draft.days[target.dateKey] = { focus: { kind: "mode", id: "creative" }, note: "" };
    expect(
      nextMatchingFocusDayOffset(draft, { kind: "mode", id: "creative" }, weekStartsOn, 0)
    ).toBe(target.offset);
  });

  it("returns null when no later matching day", () => {
    const slots = weekDaySlots(weekStartsOn);
    const draft = emptyWeekFocusDraft(slots);
    const todayKey = slots.find((s) => s.isToday)!.dateKey;
    draft.days[todayKey] = { focus: { kind: "mode", id: "creative" }, note: "" };
    const next = slots.find((s) => s.offset === 1);
    if (next) draft.days[next.dateKey] = { focus: { kind: "mode", id: "admin" }, note: "" };
    expect(
      nextMatchingFocusDayOffset(draft, { kind: "mode", id: "creative" }, weekStartsOn, 0)
    ).toBeNull();
  });
});

describe("planDeferToday", () => {
  it("clears inToday and aims doPlan at the next matching mode day", () => {
    const slots = weekDaySlots(weekStartsOn);
    const target = slots.find((s) => s.offset > 0);
    expect(target).toBeTruthy();
    const draft = emptyWeekFocusDraft(slots);
    const todayKey = slots.find((s) => s.isToday)!.dateKey;
    draft.days[todayKey] = { focus: { kind: "mode", id: "creative" }, note: "" };
    draft.days[target!.dateKey] = { focus: { kind: "mode", id: "creative" }, note: "" };

    const t = task({ id: "a", title: "Mix", workModeId: "creative", inToday: true });
    const result = planDeferToday(t, {
      todayFocus: { kind: "mode", id: "creative" },
      draft,
      weekStartsOn,
      approvedIds: new Set(["a"]),
    });
    expect(result.patch.inToday).toBe(false);
    expect(result.patch.doPlan).toEqual({ kind: "day", dateKey: target!.dateKey });
    expect(result.shouldApprove).toBe(false);
    expect(result.nextOffset).toBe(target!.offset);
  });

  it("flags approve when an unapproved open-day task can resurface", () => {
    const slots = weekDaySlots(weekStartsOn);
    const target = slots.find((s) => s.offset > 0);
    expect(target).toBeTruthy();
    const draft = emptyWeekFocusDraft(slots);
    draft.days[target!.dateKey] = { focus: { kind: "mode", id: "admin" }, note: "" };

    const t = task({ id: "b", title: "Taxes", workModeId: "admin", inToday: true });
    const result = planDeferToday(t, {
      todayFocus: null,
      draft,
      weekStartsOn,
      approvedIds: new Set(),
    });
    expect(result.patch.inToday).toBe(false);
    expect(result.shouldApprove).toBe(true);
    expect(result.nextOffset).toBe(target!.offset);
  });
});

describe("deferredTaskIds + mode bench", () => {
  it("hides deferred ids from today's mode bench while keeping approval eligibility", () => {
    const focus = { kind: "mode" as const, id: "creative" };
    const t = task({ id: "a", title: "Mix", workModeId: "creative" });
    const approved = new Set(["a"]);
    expect(taskOnTodayModeBench(t, focus, weekStartsOn, approved)).toBe(true);
    expect(taskOnTodayModeBench(t, focus, weekStartsOn, approved, new Set(["a"]))).toBe(false);
  });

  it("withDeferredTaskId is idempotent", () => {
    expect(withDeferredTaskId(["a"], "a")).toEqual(["a"]);
    expect(withDeferredTaskId(undefined, "b")).toEqual(["b"]);
  });
});

describe("resurfaceFocusForTask", () => {
  it("prefers the task work mode over today's focus when modes differ", () => {
    const t = task({ id: "x", title: "x", workModeId: "admin" });
    expect(resurfaceFocusForTask(t, { kind: "mode", id: "creative" })).toEqual({
      kind: "modes",
      ids: ["admin"],
    });
  });
});
