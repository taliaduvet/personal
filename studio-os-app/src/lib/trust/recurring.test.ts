import { describe, expect, it } from "vitest";
import { disposeTask, nextSurfaceTrigger } from "./completeness";
import { spawnNextRecurringTask } from "../recurrence";
import { dayPlan } from "../do-plan";
import type { Recurrence, Task } from "../types";

const NOW = new Date("2026-07-27T12:00:00"); // a Monday

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: "t",
    title: "Submit weekly timesheet",
    lifeAreaId: "income",
    projectId: null,
    workModeId: null,
    doPlan: null,
    deadlineInDays: null,
    status: "todo",
    inToday: false,
    completedAtInDays: null,
    parkedAt: new Date("2026-07-20T09:00:00").getTime(),
    notes: "",
    subtasks: [],
    ...overrides,
  };
}

describe("a recurring obligation can never go dormant", () => {
  // These are the definition of "things you shouldn't have to hold": timesheets,
  // quarterly taxes, prescription refills. Before this, a recurring task with no
  // explicit date classified as dormant and only appeared at the weekly review.
  const rules: Recurrence[] = [
    { kind: "daily" },
    { kind: "weekdays" },
    { kind: "weekly" },
    { kind: "everyNDays", n: 14 },
    { kind: "monthly" },
  ];

  for (const recurrence of rules) {
    it(`stays triggered with no date set — ${recurrence.kind}`, () => {
      const d = disposeTask(task({ recurrence }), NOW);
      expect(d.state).toBe("triggered");
      expect(d.trigger?.reason).toBe("recurring");
      expect(d.trigger?.dateKey).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  }

  it("defers to an explicit plan, which is the current occurrence", () => {
    const t = task({ recurrence: { kind: "weekly" }, doPlan: dayPlan(1, NOW) });
    const trigger = nextSurfaceTrigger(t, NOW);
    expect(trigger?.reason).toBe("planned");
    expect(trigger?.dateKey).toBe("2026-07-28");
  });

  it("still lets a real deadline win when it comes first", () => {
    const t = task({ recurrence: { kind: "monthly" }, deadlineDateKey: "2026-07-29" });
    expect(nextSurfaceTrigger(t, NOW)?.reason).toBe("deadline");
  });

  it("puts a daily obligation on tomorrow", () => {
    const t = task({ recurrence: { kind: "daily" } });
    expect(nextSurfaceTrigger(t, NOW)?.dateKey).toBe("2026-07-28");
  });
});

describe("completing a recurring task must not destroy the commitment", () => {
  // The whole recurrence model was orphaned: nothing called spawnNextRecurringTask,
  // so finishing a weekly timesheet deleted "weekly" forever. Silent loss of an
  // ongoing obligation is precisely what the trust core exists to prevent.
  it("produces a fresh live occurrence when one is completed", () => {
    const done = task({
      id: "t1",
      recurrence: { kind: "weekly" },
      doPlan: dayPlan(0, NOW),
      status: "done",
      completedAtInDays: 0,
      completedAtIso: "2026-07-27T19:00:00.000Z",
      inToday: true,
    });
    const next = spawnNextRecurringTask(done, "t2", NOW);

    expect(next.id).toBe("t2");
    expect(next.status).toBe("todo");
    expect(next.completedAtInDays).toBeNull();
    expect(next.completedAtIso).toBeNull();
    expect(next.recurrence).toEqual({ kind: "weekly" });
    // ...and it is scheduled, not dormant.
    expect(disposeTask(next, NOW).state).toBe("triggered");
  });

  it("schedules the next occurrence strictly in the future", () => {
    const done = task({ recurrence: { kind: "daily" }, doPlan: dayPlan(0, NOW), status: "done" });
    const next = spawnNextRecurringTask(done, "t2", NOW);
    const trigger = nextSurfaceTrigger(next, NOW);
    expect(trigger?.due).toBe(false);
    // Date keys sort lexicographically, so a plain comparison is a date comparison.
    expect((trigger?.dateKey ?? "") > "2026-07-27").toBe(true);
  });

  it("carries the rule forward so the chain continues indefinitely", () => {
    let live = task({ recurrence: { kind: "weekly" }, doPlan: dayPlan(0, NOW) });
    let clock = NOW;
    for (let i = 0; i < 5; i++) {
      const completed = { ...live, status: "done" as const };
      live = spawnNextRecurringTask(completed, `gen-${i}`, clock);
      expect(live.recurrence).toEqual({ kind: "weekly" });
      expect(disposeTask(live, clock).state).toBe("triggered");
      clock = new Date(clock.getTime() + 7 * 86_400_000);
    }
  });
});
