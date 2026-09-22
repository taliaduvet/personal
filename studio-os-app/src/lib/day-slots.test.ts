import { describe, expect, it } from "vitest";
import {
  daySlotDateKeysForFocus,
  daySlotMapForDays,
  moveTaskToDaySlot,
  tasksInDaySlot,
  unslottedBenchTasksForMode,
  type DaySlotMap,
} from "./day-slots";
import { emptyWeekFocusDraft, weekDaySlots, type WeekFocusDraft } from "./week-focus";

const weekStartsOn = 1 as const; // Monday

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

describe("daySlotDateKeysForFocus", () => {
  it("returns only dateKeys stamped with the target mode", () => {
    const slots = weekDaySlots(weekStartsOn);
    const admin = slots.filter((s) => s.offset >= 0).slice(0, 2);
    const draft = draftWithModes({ [admin[0]!.offset]: "admin", [admin[1]!.offset]: "admin" });
    const dateKeys = daySlotDateKeysForFocus(weekStartsOn, 0, draft, { kind: "mode", id: "admin" });
    expect(dateKeys.sort()).toEqual([admin[0]!.dateKey, admin[1]!.dateKey].sort());
  });

  it("returns an empty array when no day is stamped with that mode", () => {
    const draft = draftWithModes({});
    expect(daySlotDateKeysForFocus(weekStartsOn, 0, draft, { kind: "mode", id: "admin" })).toEqual([]);
  });
});

describe("daySlotMapForDays", () => {
  it("slices draft.days down to a dateKey -> slottedTaskIds map, defaulting to empty arrays", () => {
    const slots = weekDaySlots(weekStartsOn);
    const draft = emptyWeekFocusDraft(slots);
    const [a, b] = slots;
    draft.days[a!.dateKey]!.slottedTaskIds = ["t1"];
    const map = daySlotMapForDays(draft.days, [a!.dateKey, b!.dateKey]);
    expect(map[a!.dateKey]).toEqual(["t1"]);
    expect(map[b!.dateKey]).toEqual([]);
  });
});

describe("moveTaskToDaySlot", () => {
  it("places a task on a day", () => {
    const first = moveTaskToDaySlot({ mon: [], wed: [] }, "t1", "mon");
    expect(first.mon).toEqual(["t1"]);
    expect(first.wed).toEqual([]);
  });

  it("moves a task between days, removing it from the previous day", () => {
    const placed = moveTaskToDaySlot({ mon: [], wed: [] }, "t1", "mon");
    const moved = moveTaskToDaySlot(placed, "t1", "wed");
    expect(moved.mon).toEqual([]);
    expect(moved.wed).toEqual(["t1"]);
  });

  it("unplaces when dateKey is null", () => {
    const placed = moveTaskToDaySlot({ mon: [], wed: [] }, "t1", "mon");
    const cleared = moveTaskToDaySlot(placed, "t1", null);
    expect(cleared.mon).toEqual([]);
    expect(cleared.wed).toEqual([]);
  });
});

describe("tasksInDaySlot", () => {
  it("resolves ids to tasks and drops missing ids", () => {
    const tasks = [
      { id: "a", title: "A" },
      { id: "b", title: "B" },
    ] as Parameters<typeof tasksInDaySlot>[0];
    expect(tasksInDaySlot(tasks, ["b", "missing"]).map((t) => t.id)).toEqual(["b"]);
  });

  it("returns an empty array when taskIds is undefined", () => {
    const tasks = [{ id: "a", title: "A" }] as Parameters<typeof tasksInDaySlot>[0];
    expect(tasksInDaySlot(tasks, undefined)).toEqual([]);
  });
});

describe("unslottedBenchTasksForMode", () => {
  it("excludes tasks already placed on any day in the slot map", () => {
    const bench = [
      { id: "a", title: "A" },
      { id: "b", title: "B" },
    ] as Parameters<typeof unslottedBenchTasksForMode>[0];
    const slotMap: DaySlotMap = { mon: ["a"], wed: [] };
    expect(unslottedBenchTasksForMode(bench, slotMap).map((t) => t.id)).toEqual(["b"]);
  });
});
