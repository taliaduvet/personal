import { describe, expect, it } from "vitest";
import {
  blockForLocalMs,
  eventsByShapeBlock,
  hasDayShapeSummary,
  moveTaskToShapeBlock,
  unassignedShapeBenchTasks,
} from "./day-shape";
import type { TimedEventSlice } from "./calendar/types";

function localMs(dateKey: string, hour: number, minute = 0): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d, hour, minute, 0, 0).getTime();
}

describe("blockForLocalMs", () => {
  it("maps hours to morning, afternoon, evening", () => {
    const dk = "2026-07-09";
    expect(blockForLocalMs(localMs(dk, 9))).toBe("morning");
    expect(blockForLocalMs(localMs(dk, 12))).toBe("afternoon");
    expect(blockForLocalMs(localMs(dk, 18))).toBe("evening");
  });
});

describe("eventsByShapeBlock", () => {
  it("buckets timed events by start hour", () => {
    const dk = "2026-07-09";
    const events: TimedEventSlice[] = [
      { id: "a", summary: "Standup", dateKey: dk, startMs: localMs(dk, 10), endMs: localMs(dk, 10, 30) },
      { id: "b", summary: "Lunch", dateKey: dk, startMs: localMs(dk, 13), endMs: localMs(dk, 14) },
    ];
    const buckets = eventsByShapeBlock(events);
    expect(buckets.morning.map((e) => e.id)).toEqual(["a"]);
    expect(buckets.afternoon.map((e) => e.id)).toEqual(["b"]);
    expect(buckets.evening).toEqual([]);
  });
});

describe("moveTaskToShapeBlock", () => {
  it("moves a task between blocks", () => {
    const first = moveTaskToShapeBlock(undefined, "t1", "morning");
    expect(first.morning).toEqual(["t1"]);
    const moved = moveTaskToShapeBlock(first, "t1", "evening");
    expect(moved.morning).toEqual([]);
    expect(moved.evening).toEqual(["t1"]);
  });

  it("unassigns when block is null", () => {
    const placed = moveTaskToShapeBlock(undefined, "t1", "afternoon");
    const cleared = moveTaskToShapeBlock(placed, "t1", null);
    expect(cleared.afternoon).toEqual([]);
  });
});

describe("unassignedShapeBenchTasks", () => {
  it("excludes tasks already placed in a block", () => {
    const bench = [
      { id: "a", title: "A" },
      { id: "b", title: "B" },
    ] as Parameters<typeof unassignedShapeBenchTasks>[0];
    const unassigned = unassignedShapeBenchTasks(bench, { morning: ["a"] });
    expect(unassigned.map((t) => t.id)).toEqual(["b"]);
  });
});

describe("hasDayShapeSummary", () => {
  it("is false when nothing shaped", () => {
    expect(
      hasDayShapeSummary({ note: "", shapeBlockTasks: {} }, { timedEvents: [], allDayEvents: [] })
    ).toBe(false);
  });

  it("is true when tasks are placed", () => {
    expect(
      hasDayShapeSummary(
        { note: "", shapeBlockTasks: { morning: ["t1"] } },
        { timedEvents: [], allDayEvents: [] }
      )
    ).toBe(true);
  });
});
