import { describe, expect, it } from "vitest";
import {
  dayCloseAssignableTasks,
  hasDayCloseContent,
  yesterdayNote,
} from "./day-close";
import type { ActivityLogEntry } from "./activity-log";
import type { Task } from "./types";

const baseTask = (overrides: Partial<Task> & Pick<Task, "id">): Task => ({
  title: "Task",
  lifeAreaId: "music",
  projectId: null,
  workModeId: "creative",
  doPlan: null,
  deadlineInDays: null,
  status: "todo",
  inToday: false,
  completedAtInDays: null,
  parkedAt: 0,
  notes: "",
  subtasks: [],
  ...overrides,
});

describe("hasDayCloseContent", () => {
  it("accepts duration or review", () => {
    expect(hasDayCloseContent({ durationMs: 0, reviewNote: null })).toBe(false);
    expect(hasDayCloseContent({ durationMs: 3600, reviewNote: null })).toBe(true);
    expect(hasDayCloseContent({ durationMs: 0, reviewNote: "wrapped mix" })).toBe(true);
  });
});

describe("yesterdayNote", () => {
  it("returns review from prior day retro", () => {
    const log: ActivityLogEntry[] = [
      {
        id: "r1",
        atIso: new Date().toISOString(),
        kind: "day_close_retro",
        dateKey: new Date(Date.now() - 86_400_000).toISOString().slice(0, 10),
        durationMs: 0,
        reviewNote: "vocals almost done",
      },
    ];
    const note = yesterdayNote(log);
    expect(note?.reviewNote).toBe("vocals almost done");
  });
});

describe("dayCloseAssignableTasks", () => {
  it("includes today bench and in-progress tasks", () => {
    const tasks = [
      baseTask({ id: "t1", inToday: true }),
      baseTask({ id: "t2", status: "in_progress" }),
      baseTask({ id: "t3" }),
    ];
    expect(dayCloseAssignableTasks(tasks, [], "2026-07-09").map((t) => t.id)).toEqual(["t1", "t2"]);
  });
});
