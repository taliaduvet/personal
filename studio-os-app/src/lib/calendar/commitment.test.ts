import { describe, expect, it } from "vitest";
import {
  computeDayCommitment,
  mergeIntervals,
  mergedIntervalHours,
  sliceTimedEventForDay,
} from "./commitment";
import type { RawCalendarEvent } from "./types";

const DATE = "2026-03-19";

function timed(
  id: string,
  start: string,
  end: string,
  summary = "Event"
): RawCalendarEvent {
  return {
    id,
    summary,
    start: { dateTime: start },
    end: { dateTime: end },
    status: "confirmed",
  };
}

describe("mergeIntervals", () => {
  it("merges overlapping intervals", () => {
    expect(mergeIntervals([
      [0, 60],
      [30, 90],
    ])).toEqual([[0, 90]]);
  });

  it("keeps separate non-overlapping intervals", () => {
    expect(mergeIntervals([
      [0, 60],
      [120, 180],
    ])).toEqual([
      [0, 60],
      [120, 180],
    ]);
  });
});

describe("mergedIntervalHours", () => {
  it("does not double-count overlapping meetings", () => {
    const h = mergedIntervalHours([
      [Date.parse("2026-03-19T09:00:00"), Date.parse("2026-03-19T10:00:00")],
      [Date.parse("2026-03-19T09:30:00"), Date.parse("2026-03-19T10:30:00")],
    ]);
    expect(h).toBe(1.5);
  });
});

describe("sliceTimedEventForDay", () => {
  it("assigns event to local calendar day, not UTC", () => {
    // 11pm local Mar 18 – 1am local Mar 19 should only appear on Mar 19 slice
    const ev = timed(
      "e1",
      "2026-03-19T00:30:00",
      "2026-03-19T01:30:00"
    );
    const slice = sliceTimedEventForDay(ev, DATE);
    expect(slice).not.toBeNull();
    expect(slice!.dateKey).toBe(DATE);
  });

  it("clips multi-hour event to day boundary", () => {
    const ev = timed("e2", "2026-03-19T22:00:00", "2026-03-20T02:00:00");
    const slice = sliceTimedEventForDay(ev, DATE);
    expect(slice).not.toBeNull();
    const hours = (slice!.endMs - slice!.startMs) / 3_600_000;
    expect(hours).toBe(2);
  });
});

describe("computeDayCommitment", () => {
  it("sums timed hours with overlap merge", () => {
    const events = [
      timed("a", "2026-03-19T09:00:00", "2026-03-19T10:00:00"),
      timed("b", "2026-03-19T09:30:00", "2026-03-19T11:00:00"),
    ];
    const day = computeDayCommitment(DATE, events);
    expect(day.timedHours).toBe(2);
    expect(day.timedEvents).toHaveLength(2);
  });

  it("ignores transparent and cancelled events", () => {
    const events: RawCalendarEvent[] = [
      { ...timed("a", "2026-03-19T09:00:00", "2026-03-19T10:00:00"), transparency: "transparent" },
      { ...timed("b", "2026-03-19T11:00:00", "2026-03-19T12:00:00"), status: "cancelled" },
      timed("c", "2026-03-19T14:00:00", "2026-03-19T15:00:00"),
    ];
    const day = computeDayCommitment(DATE, events);
    expect(day.timedHours).toBe(1);
  });

  it("lists all-day separately without adding to timed hours", () => {
    const events: RawCalendarEvent[] = [
      {
        id: "allday",
        summary: "Grant deadline",
        start: { date: DATE },
        status: "confirmed",
      },
      timed("t", "2026-03-19T10:00:00", "2026-03-19T11:00:00"),
    ];
    const day = computeDayCommitment(DATE, events);
    expect(day.timedHours).toBe(1);
    expect(day.allDayEvents).toHaveLength(1);
    expect(day.allDayEvents[0].summary).toBe("Grant deadline");
  });

  it("marks blocked when all-day disposition is blocks", () => {
    const events: RawCalendarEvent[] = [
      {
        id: "travel",
        summary: "Travel",
        start: { date: DATE },
        status: "confirmed",
      },
    ];
    const day = computeDayCommitment(DATE, events, { [`${DATE}:travel`]: "blocks" });
    expect(day.blocked).toBe(true);
    expect(day.timedHours).toBe(0);
  });

  it("counts event spanning midnight on both days", () => {
    const ev = timed("span", "2026-03-19T23:00:00", "2026-03-20T01:00:00");
    const day19 = computeDayCommitment("2026-03-19", [ev]);
    const day20 = computeDayCommitment("2026-03-20", [ev]);
    expect(day19.timedHours).toBe(1);
    expect(day20.timedHours).toBe(1);
  });
});
