import { describe, expect, it } from "vitest";
import { composeDayLedger, entriesOnDate } from "./day-ledger";
import type { ActivityLogEntry } from "./activity-log";
import type { Task } from "./types";

const baseTask = (overrides: Partial<Task> & Pick<Task, "id">): Task => ({
  title: "Task",
  lifeAreaId: "music",
  projectId: null,
  workModeId: "creative",
  doDateInDays: 0,
  deadlineInDays: null,
  status: "todo",
  inToday: false,
  notes: "",
  subtasks: [],
  ...overrides,
});

describe("entriesOnDate", () => {
  it("matches session_end by atIso local date", () => {
    const log: ActivityLogEntry[] = [
      {
        id: "e1",
        atIso: "2026-07-09T18:00:00.000Z",
        kind: "session_end",
        taskId: "t1",
        projectId: null,
        startedAtIso: "2026-07-09T17:00:00.000Z",
        durationMs: 3_600_000,
      },
    ];
    const key = new Date("2026-07-09T18:00:00.000Z");
    const dateKey = `${key.getFullYear()}-${String(key.getMonth() + 1).padStart(2, "0")}-${String(key.getDate()).padStart(2, "0")}`;
    expect(entriesOnDate(log, dateKey)).toHaveLength(1);
  });

  it("matches day_close_retro by dateKey field", () => {
    const log: ActivityLogEntry[] = [
      {
        id: "r1",
        atIso: "2026-07-09T22:00:00.000Z",
        kind: "day_close_retro",
        dateKey: "2026-07-09",
        durationMs: 7_200_000,
      },
    ];
    expect(entriesOnDate(log, "2026-07-09")).toHaveLength(1);
    expect(entriesOnDate(log, "2026-07-08")).toHaveLength(0);
  });
});

describe("composeDayLedger", () => {
  it("returns empty ledger for quiet day", () => {
    const ledger = composeDayLedger({
      dateKey: "2026-07-09",
      log: [],
      tasks: [],
    });
    expect(ledger.isEmpty).toBe(true);
    expect(ledger.sections).toHaveLength(0);
  });

  it("includes shipped with attribution", () => {
    const log: ActivityLogEntry[] = [
      {
        id: "c1",
        atIso: "2026-07-09T20:00:00.000Z",
        kind: "task_complete",
        taskId: "t1",
        completedAtIso: "2026-07-09T20:00:00.000Z",
        attribution: "session",
        sessionId: "s1",
      },
    ];
    const tasks = [baseTask({ id: "t1", title: "Ship mix" })];
    const dateKey = `${new Date("2026-07-09T20:00:00.000Z").getFullYear()}-${String(new Date("2026-07-09T20:00:00.000Z").getMonth() + 1).padStart(2, "0")}-${String(new Date("2026-07-09T20:00:00.000Z").getDate()).padStart(2, "0")}`;
    const ledger = composeDayLedger({ dateKey, log, tasks });
    const shipped = ledger.sections.find((s) => s.kind === "shipped");
    expect(shipped?.kind).toBe("shipped");
    if (shipped?.kind === "shipped") {
      expect(shipped.items[0].title).toBe("Ship mix");
      expect(shipped.items[0].attribution).toBe("during session");
    }
  });

  it("includes stated retro separately from sessions", () => {
    const log: ActivityLogEntry[] = [
      {
        id: "r1",
        atIso: "2026-07-09T22:00:00.000Z",
        kind: "day_close_retro",
        dateKey: "2026-07-09",
        durationMs: 3_600_000,
        taskId: "t1",
        reviewNote: "polished the bridge",
      },
      {
        id: "e1",
        atIso: "2026-07-09T18:00:00.000Z",
        kind: "session_end",
        taskId: "t1",
        projectId: null,
        startedAtIso: "2026-07-09T17:00:00.000Z",
        durationMs: 1_800_000,
      },
    ];
    const ledger = composeDayLedger({
      dateKey: "2026-07-09",
      log,
      tasks: [baseTask({ id: "t1" })],
    });
    expect(ledger.sections.some((s) => s.kind === "stated")).toBe(true);
    expect(ledger.sections.some((s) => s.kind === "sessions")).toBe(true);
  });
});
