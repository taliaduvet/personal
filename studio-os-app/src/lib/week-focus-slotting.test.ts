import { describe, expect, it } from "vitest";
import type { Task } from "./types";
import { dayPlan } from "./do-plan";
import {
  computeTodayBench,
  emptyWeekFocusDraft,
  modeSlottingForToday,
  tasksForTodayModeBench,
  weekDaySlots,
  type WeekFocusDraft,
} from "./week-focus";

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

function baseDraft(): { draft: WeekFocusDraft; todayKey: string } {
  const slots = weekDaySlots(weekStartsOn);
  const draft = emptyWeekFocusDraft(slots);
  const todayKey = slots.find((s) => s.isToday)!.dateKey;
  draft.days[todayKey] = { focus: { kind: "mode", id: "admin" }, note: "" };
  return { draft, todayKey };
}

describe("modeSlottingForToday", () => {
  it("is not explicitly slotted when no admin day has any slottedTaskIds", () => {
    const { draft, todayKey } = baseDraft();
    const result = modeSlottingForToday(draft, { kind: "mode", id: "admin" }, weekStartsOn, todayKey);
    expect(result.isExplicitlySlotted).toBe(false);
    expect(result.slottedTodayIds.size).toBe(0);
  });

  it("is explicitly slotted once any day stamped with the mode this week has a placed task", () => {
    const { draft, todayKey } = baseDraft();
    const slots = weekDaySlots(weekStartsOn);
    const other = slots.find((s) => s.offset > 0 && s.dateKey !== todayKey);
    if (other) {
      draft.days[other.dateKey] = {
        focus: { kind: "mode", id: "admin" },
        note: "",
        slottedTaskIds: ["elsewhere"],
      };
    }
    const result = modeSlottingForToday(draft, { kind: "mode", id: "admin" }, weekStartsOn, todayKey);
    expect(result.isExplicitlySlotted).toBe(true);
    // Today itself has nothing placed yet — slottedTodayIds reflects only today's own entry.
    expect(result.slottedTodayIds.size).toBe(0);
  });

  it("slottedTodayIds reflects only today's own placements", () => {
    const { draft, todayKey } = baseDraft();
    draft.days[todayKey]!.slottedTaskIds = ["a", "b"];
    const result = modeSlottingForToday(draft, { kind: "mode", id: "admin" }, weekStartsOn, todayKey);
    expect(result.isExplicitlySlotted).toBe(true);
    expect([...result.slottedTodayIds].sort()).toEqual(["a", "b"]);
  });
});

describe("tasksForTodayModeBench with slotting", () => {
  const focus = { kind: "mode" as const, id: "admin" };

  it("without a slotting arg, behaves exactly as before (full approved+matching pool)", () => {
    const a = task({ id: "a", title: "A" });
    const b = task({ id: "b", title: "B" });
    const approved = new Set(["a", "b"]);
    const bench = tasksForTodayModeBench([a, b], focus, weekStartsOn, approved);
    expect(bench.map((t) => t.id).sort()).toEqual(["a", "b"]);
  });

  it("when explicitly slotted, only shows tasks slotted for today", () => {
    const a = task({ id: "a", title: "A" });
    const b = task({ id: "b", title: "B" });
    const approved = new Set(["a", "b"]);
    const slotting = { isExplicitlySlotted: true, slottedTodayIds: new Set(["a"]) };
    const bench = tasksForTodayModeBench([a, b], focus, weekStartsOn, approved, new Set(), slotting);
    expect(bench.map((t) => t.id)).toEqual(["a"]);
  });

  it("in-progress and carried-over tasks bypass the slotting filter", () => {
    const inProgress = task({ id: "ip", title: "In progress", status: "in_progress" });
    const carried = task({ id: "c", title: "Carried", doPlan: dayPlan(-1) });
    const unslotted = task({ id: "u", title: "Unslotted" });
    const approved = new Set(["ip", "c", "u"]);
    const slotting = { isExplicitlySlotted: true, slottedTodayIds: new Set<string>() };
    const bench = tasksForTodayModeBench(
      [inProgress, carried, unslotted],
      focus,
      weekStartsOn,
      approved,
      new Set(),
      slotting
    );
    expect(bench.map((t) => t.id).sort()).toEqual(["c", "ip"]);
  });
});

describe("computeTodayBench", () => {
  it("returns the mode bench and alsoToday on a mode day", () => {
    const { draft, todayKey } = baseDraft();
    draft.approvedTaskIds = ["a", "outside"];
    const adminTask = task({ id: "a", title: "Admin task" });
    const outsideModeTask = task({ id: "outside", title: "Outside mode", workModeId: "creative", inToday: true });
    const result = computeTodayBench([adminTask, outsideModeTask], draft, weekStartsOn, todayKey);
    expect(result.hasModeDay).toBe(true);
    expect(result.modeBench.map((t) => t.id)).toEqual(["a"]);
    expect(result.alsoToday.map((t) => t.id)).toEqual(["outside"]);
  });

  it("respects slotting once a day in the mode has an explicit placement", () => {
    const { draft, todayKey } = baseDraft();
    draft.approvedTaskIds = ["a", "b"];
    draft.days[todayKey]!.slottedTaskIds = ["a"];
    const a = task({ id: "a", title: "A" });
    const b = task({ id: "b", title: "B" });
    const result = computeTodayBench([a, b], draft, weekStartsOn, todayKey);
    expect(result.modeBench.map((t) => t.id)).toEqual(["a"]);
  });

  it("falls back to openDayTasks on an open day", () => {
    const slots = weekDaySlots(weekStartsOn);
    const draft = emptyWeekFocusDraft(slots);
    const todayKey = slots.find((s) => s.isToday)!.dateKey;
    const t = task({ id: "x", title: "X", inToday: true });
    const result = computeTodayBench([t], draft, weekStartsOn, todayKey);
    expect(result.hasModeDay).toBe(false);
    expect(result.openDayTasks.map((tk) => tk.id)).toEqual(["x"]);
    expect(result.modeBench).toEqual([]);
  });
});
