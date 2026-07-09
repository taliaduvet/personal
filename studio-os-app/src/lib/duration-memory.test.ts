import { describe, expect, it } from "vitest";
import {
  comparableDoneTasks,
  projectSessionRollup,
  similarWorkHint,
  taskSessionStats,
} from "./duration-memory";
import type { ActivityLogEntry } from "./activity-log";
import type { Task } from "./types";

const sessionEnd = (
  id: string,
  taskId: string,
  atIso: string,
  durationMs: number
): ActivityLogEntry => ({
  id,
  atIso,
  kind: "session_end",
  taskId,
  projectId: null,
  startedAtIso: atIso,
  durationMs,
});

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

describe("taskSessionStats", () => {
  it("returns null when no sessions", () => {
    const task = baseTask({ id: "t1" });
    expect(taskSessionStats(task, [])).toBeNull();
  });

  it("sums sessions for a task", () => {
    const task = baseTask({
      id: "t1",
      subtasks: [
        { id: "s1", title: "a", done: true },
        { id: "s2", title: "b", done: false },
      ],
    });
    const log = [
      sessionEnd("e1", "t1", "2026-07-09T10:00:00.000Z", 3_600_000),
      sessionEnd("e2", "t1", "2026-07-10T10:00:00.000Z", 1_800_000),
    ];
    const stats = taskSessionStats(task, log);
    expect(stats?.sessionCount).toBe(2);
    expect(stats?.totalMs).toBe(5_400_000);
    expect(stats?.subtasksDone).toBe(1);
    expect(stats?.subtasksTotal).toBe(2);
    expect(stats?.spanDays).toBeGreaterThanOrEqual(1);
  });
});

describe("similarWorkHint", () => {
  it("requires at least two comparable done tasks", () => {
    const task = baseTask({ id: "current", workModeId: "creative" });
    const tasks = [
      task,
      baseTask({ id: "d1", status: "done", workModeId: "creative" }),
    ];
    const log = [sessionEnd("e1", "d1", "2026-07-09T10:00:00.000Z", 3_600_000)];
    expect(similarWorkHint(task, tasks, log)).toBeNull();
  });

  it("returns range when two or more comparables exist", () => {
    const task = baseTask({ id: "current", workModeId: "creative" });
    const tasks = [
      task,
      baseTask({ id: "d1", status: "done", workModeId: "creative" }),
      baseTask({ id: "d2", status: "done", workModeId: "creative" }),
    ];
    const log = [
      sessionEnd("e1", "d1", "2026-07-09T10:00:00.000Z", 3_600_000),
      sessionEnd("e2", "d1", "2026-07-09T14:00:00.000Z", 3_600_000),
      sessionEnd("e3", "d2", "2026-07-09T10:00:00.000Z", 7_200_000),
    ];
    const hint = similarWorkHint(task, tasks, log);
    expect(hint).not.toBeNull();
    expect(hint!.sampleCount).toBe(2);
    expect(hint!.sessionRange[0]).toBeGreaterThanOrEqual(1);
  });

  it("excludes admin mode from hints", () => {
    const task = baseTask({ id: "current", workModeId: "admin" });
    const tasks = [
      task,
      baseTask({ id: "d1", status: "done", workModeId: "admin" }),
      baseTask({ id: "d2", status: "done", workModeId: "admin" }),
    ];
    const log = [
      sessionEnd("e1", "d1", "2026-07-09T10:00:00.000Z", 3_600_000),
      sessionEnd("e2", "d2", "2026-07-09T10:00:00.000Z", 3_600_000),
    ];
    expect(similarWorkHint(task, tasks, log)).toBeNull();
  });
});

describe("comparableDoneTasks", () => {
  it("filters done tasks with sessions in same mode", () => {
    const tasks = [
      baseTask({ id: "d1", status: "done", workModeId: "creative" }),
      baseTask({ id: "d2", status: "todo", workModeId: "creative" }),
      baseTask({ id: "d3", status: "done", workModeId: "admin" }),
    ];
    const log = [sessionEnd("e1", "d1", "2026-07-09T10:00:00.000Z", 1000)];
    expect(comparableDoneTasks("creative", "current", tasks, log)).toHaveLength(1);
  });
});

describe("projectSessionRollup", () => {
  it("returns null when no sessions", () => {
    const tasks = [baseTask({ id: "t1", projectId: "p1" })];
    expect(projectSessionRollup("p1", tasks, [])).toBeNull();
  });

  it("sums sessions across project tasks", () => {
    const tasks = [
      baseTask({ id: "t1", projectId: "p1" }),
      baseTask({ id: "t2", projectId: "p1" }),
      baseTask({ id: "t3", projectId: "p2" }),
    ];
    const log = [
      sessionEnd("e1", "t1", "2026-07-09T10:00:00.000Z", 3_600_000),
      sessionEnd("e2", "t2", "2026-07-09T11:00:00.000Z", 1_800_000),
    ];
    const rollup = projectSessionRollup("p1", tasks, log);
    expect(rollup?.taskCount).toBe(2);
    expect(rollup?.totalMs).toBe(5_400_000);
  });
});
