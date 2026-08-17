import { describe, expect, it } from "vitest";
import {
  countedItems,
  dayRecord,
  formatClock,
  trackDoneOnDate,
  weekDateKeys,
  type BodyProgramState,
} from "./body-program";

const MONDAY = new Date("2026-07-13T12:00:00"); // confirmed Monday

describe("weekDateKeys", () => {
  it("returns Monday through Sunday for the current week", () => {
    expect(weekDateKeys(0, MONDAY)).toEqual([
      "2026-07-13",
      "2026-07-14",
      "2026-07-15",
      "2026-07-16",
      "2026-07-17",
      "2026-07-18",
      "2026-07-19",
    ]);
  });

  it("shifts a full week back per negative offset", () => {
    expect(weekDateKeys(-1, MONDAY)).toEqual([
      "2026-07-06",
      "2026-07-07",
      "2026-07-08",
      "2026-07-09",
      "2026-07-10",
      "2026-07-11",
      "2026-07-12",
    ]);
  });
});

describe("countedItems", () => {
  it("excludes nocount items from the daily track", () => {
    const ids = countedItems("daily").map((i) => i.id);
    expect(ids).toEqual(["d1", "d2", "d3", "d4", "d5", "d6"]);
  });
});

describe("trackDoneOnDate", () => {
  it("is false when there's no record for the date", () => {
    const state: BodyProgramState = { days: {} };
    expect(trackDoneOnDate(state, "mobility", "2026-07-13")).toBe(false);
  });

  it("is true only once every counted item is checked", () => {
    const state: BodyProgramState = {
      days: { "2026-07-13": { checks: { m1: true, m2: true, m3: true }, feel: null } },
    };
    expect(trackDoneOnDate(state, "mobility", "2026-07-13")).toBe(true);

    const partial: BodyProgramState = {
      days: { "2026-07-13": { checks: { m1: true, m2: true }, feel: null } },
    };
    expect(trackDoneOnDate(partial, "mobility", "2026-07-13")).toBe(false);
  });
});

describe("dayRecord", () => {
  it("returns a default record without mutating state", () => {
    const state: BodyProgramState = { days: {} };
    expect(dayRecord(state, "2026-07-13")).toEqual({ checks: {}, feel: null });
    expect(state.days).toEqual({});
  });
});

describe("formatClock", () => {
  it("formats seconds as M:SS", () => {
    expect(formatClock(65)).toBe("1:05");
    expect(formatClock(600)).toBe("10:00");
    expect(formatClock(0)).toBe("0:00");
  });
});
