import { describe, expect, it } from "vitest";
import {
  buildEventIds,
  dateKeyFromOffset,
  doingDayFromPlan,
  nextWeekdayAt,
  parseEventIds,
} from "./event-ids";

describe("parseEventIds", () => {
  it("parses both tags", () => {
    expect(parseEventIds("deadline:abc|doing:def")).toEqual({
      deadline: "abc",
      doing: "def",
    });
  });

  it("parses partial", () => {
    expect(parseEventIds("deadline:only")).toEqual({ deadline: "only", doing: null });
  });
});

describe("buildEventIds", () => {
  it("round-trips", () => {
    const raw = buildEventIds({ deadline: "a", doing: "b" });
    expect(parseEventIds(raw)).toEqual({ deadline: "a", doing: "b" });
  });
});

describe("nextWeekdayAt", () => {
  it("finds next Friday from Thursday", () => {
    const thu = new Date("2026-06-18T12:00:00");
    const fri = nextWeekdayAt("Fri", 9, 0, thu);
    expect(fri?.getDay()).toBe(5);
    expect(fri?.getDate()).toBe(19);
  });
});

describe("doingDayFromPlan", () => {
  it("returns 1-hour block", () => {
    const block = doingDayFromPlan("Mon", 9, 0);
    expect(block).not.toBeNull();
    expect(block!.end.getTime() - block!.start.getTime()).toBe(3_600_000);
  });
});

describe("dateKeyFromOffset", () => {
  it("returns iso date for today", () => {
    const key = dateKeyFromOffset(0);
    expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
