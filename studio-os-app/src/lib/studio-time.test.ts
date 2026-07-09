import { describe, expect, it } from "vitest";
import { formatStudioDuration, studioMsInWeek } from "./studio-time";
import type { ActivityLogEntry } from "./activity-log";

describe("formatStudioDuration", () => {
  it("formats minutes and hours", () => {
    expect(formatStudioDuration(0)).toBe("—");
    expect(formatStudioDuration(42 * 60_000)).toBe("42m");
    expect(formatStudioDuration(90 * 60_000)).toBe("1.5h");
  });
});

describe("studioMsInWeek", () => {
  it("sums session_end durations in range", () => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const log: ActivityLogEntry[] = [
      {
        id: "e1",
        atIso: today.toISOString(),
        kind: "session_end",
        taskId: "t1",
        projectId: null,
        startedAtIso: today.toISOString(),
        durationMs: 3_600_000,
      },
    ];
    expect(studioMsInWeek(log, 0, 6)).toBe(3_600_000);
  });
});
