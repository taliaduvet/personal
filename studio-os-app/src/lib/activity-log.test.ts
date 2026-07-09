import { describe, expect, it } from "vitest";
import {
  appendActivityLogEntry,
  entriesInWeek,
  mergeActivityLogs,
  newActivityLogId,
  sessionEndEntries,
  type ActivityLogEntry,
} from "./activity-log";

const sessionEnd = (id: string, atIso: string, durationMs: number) => ({
  id,
  atIso,
  kind: "session_end" as const,
  taskId: "t1",
  projectId: null,
  startedAtIso: atIso,
  durationMs,
});

describe("appendActivityLogEntry", () => {
  it("appends entries", () => {
    let log: ActivityLogEntry[] = [];
    log = appendActivityLogEntry(log, {
      id: "e1",
      atIso: new Date().toISOString(),
      kind: "session_start",
      taskId: "t1",
      projectId: null,
    });
    expect(log).toHaveLength(1);
  });
});

describe("mergeActivityLogs", () => {
  it("dedupes by id and sorts by time", () => {
    const merged = mergeActivityLogs(
      [{ id: "a", atIso: "2026-07-09T10:00:00.000Z", kind: "session_start", taskId: "t1", projectId: null }],
      [
        { id: "b", atIso: "2026-07-09T12:00:00.000Z", kind: "session_start", taskId: "t2", projectId: null },
        { id: "a", atIso: "2026-07-09T10:00:00.000Z", kind: "session_start", taskId: "t1", projectId: null },
      ]
    );
    expect(merged.map((e) => e.id)).toEqual(["a", "b"]);
  });
});

describe("entriesInWeek", () => {
  it("filters by offset range", () => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const log = [sessionEnd("e1", today.toISOString(), 3_600_000)];
    expect(entriesInWeek(log, 0, 6)).toHaveLength(1);
    expect(entriesInWeek(log, -7, -1)).toHaveLength(0);
  });
});

describe("sessionEndEntries", () => {
  it("returns only session_end rows", () => {
    const log = [
      sessionEnd("e1", new Date().toISOString(), 1000),
      { id: "e2", atIso: new Date().toISOString(), kind: "session_start" as const, taskId: "t1", projectId: null },
    ];
    expect(sessionEndEntries(log)).toHaveLength(1);
    expect(newActivityLogId()).toMatch(/^al-/);
  });
});
