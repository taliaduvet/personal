import { describe, expect, it } from "vitest";
import {
  disposeTask,
  disposeAll,
  dormant,
  dueNow,
  isActiveTask,
  nextSurfaceTrigger,
  taskAgeDays,
  taskDataFaults,
} from "./completeness";
import { CHASE_CHECK_DAYS } from "./commitments";
import { dayPlan, weekPlan } from "../do-plan";
import type { DoPlan, Task, TaskStatus, WaitingOn } from "../types";

const NOW = new Date("2026-07-27T12:00:00");
const TODAY = "2026-07-27";

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: "t",
    title: "A task",
    lifeAreaId: "music",
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

describe("the completeness invariant", () => {
  // The matrix deliberately includes null, past, today, future, and malformed
  // values for every field that can produce a trigger — plus contradictory
  // combinations — because a hole in this classifier is a task the user is
  // silently no longer being told about.
  const deadlines = [null, "2026-07-01", TODAY, "2026-12-25", "not-a-date", ""];
  const respondBys = [null, "2026-06-15", TODAY, "2026-08-30", "13/04/2026"];
  const startThinkings = [null, "2026-07-10", "2026-09-01", "2026-7-1"];
  const plans: DoPlan[] = [
    null,
    dayPlan(-5, NOW),
    dayPlan(0, NOW),
    dayPlan(9, NOW),
    weekPlan("2026-07-26"),
    { kind: "day", dateKey: "garbage" } as DoPlan,
  ];
  const waitings: (WaitingOn | null)[] = [
    null,
    { personId: null, personName: "Sam", sinceIso: "2026-07-01T00:00:00.000Z" },
    { personId: null, personName: "Kim", sinceIso: "nonsense" },
  ];
  const statuses: TaskStatus[] = ["todo", "in_progress", "done"];

  const matrix: Task[] = [];
  for (const deadlineDateKey of deadlines)
    for (const respondByDateKey of respondBys)
      for (const startThinkingAtDateKey of startThinkings)
        for (const doPlan of plans)
          for (const waitingOn of waitings)
            for (const status of statuses)
              matrix.push(
                task({
                  deadlineDateKey: deadlineDateKey as string | null,
                  respondByDateKey: respondByDateKey as string | null,
                  startThinkingAtDateKey: startThinkingAtDateKey as string | null,
                  doPlan,
                  waitingOn,
                  status,
                })
              );

  it("covers a large combination space", () => {
    expect(matrix.length).toBeGreaterThan(2000);
  });

  it("classifies EVERY active task — no task is ever unclassified", () => {
    const unclassified = matrix
      .filter(isActiveTask)
      .filter((t) => {
        const d = disposeTask(t, NOW);
        return !d || (d.state !== "triggered" && d.state !== "dormant");
      });
    expect(unclassified).toHaveLength(0);
  });

  it("never lets a task holding a real date fall dormant", () => {
    // This is the invariant that actually protects the user: a task with any
    // usable date must come back on that date. Going dormant would hide it
    // until the weekly sweep.
    const escaped = matrix.filter(isActiveTask).filter((t) => {
      const hasUsableDate =
        looksLikeDate(t.deadlineDateKey) ||
        looksLikeDate(t.respondByDateKey) ||
        looksLikeDate(t.startThinkingAtDateKey) ||
        (t.doPlan?.kind === "day" && looksLikeDate(t.doPlan.dateKey)) ||
        (t.doPlan?.kind === "week" && looksLikeDate(t.doPlan.weekStart));
      return hasUsableDate && disposeTask(t, NOW).state === "dormant";
    });
    expect(escaped).toHaveLength(0);
  });

  it("gives every dormant task an age so the review can order it", () => {
    const bad = matrix
      .filter(isActiveTask)
      .map((t) => disposeTask(t, NOW))
      .filter((d) => d.state === "dormant" && !(Number.isFinite(d.ageDays) && d.ageDays >= 0));
    expect(bad).toHaveLength(0);
  });

  it("only ever emits a valid date key as a trigger", () => {
    const bad = matrix
      .filter(isActiveTask)
      .map((t) => disposeTask(t, NOW))
      .filter((d) => d.state === "triggered" && !/^\d{4}-\d{2}-\d{2}$/.test(d.trigger.dateKey));
    expect(bad).toHaveLength(0);
  });

  it("partitions active tasks into exactly due-now + not-due + dormant", () => {
    const active = matrix.filter(isActiveTask);
    const all = disposeAll(matrix, NOW);
    expect(all).toHaveLength(active.length);

    const due = all.filter((d) => d.disposition.state === "triggered" && d.disposition.trigger.due);
    const later = all.filter(
      (d) => d.disposition.state === "triggered" && !d.disposition.trigger.due
    );
    const sleeping = all.filter((d) => d.disposition.state === "dormant");
    expect(due.length + later.length + sleeping.length).toBe(active.length);
  });

  it("excludes completed work — the shelf is out of scope by definition", () => {
    expect(disposeAll(matrix, NOW).some((d) => d.task.status === "done")).toBe(false);
  });
});

function looksLikeDate(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

describe("choosing the trigger", () => {
  it("surfaces on the earliest date that matters", () => {
    const t = task({
      deadlineDateKey: "2026-08-14",
      startThinkingAtDateKey: "2026-08-06",
      doPlan: dayPlan(20, NOW),
    });
    expect(nextSurfaceTrigger(t, NOW)).toMatchObject({
      dateKey: "2026-08-06",
      reason: "start_thinking",
    });
  });

  it("lets an overdue deadline dominate a later plan", () => {
    const t = task({ deadlineDateKey: "2026-07-20", doPlan: dayPlan(3, NOW) });
    expect(nextSurfaceTrigger(t, NOW)).toMatchObject({
      dateKey: "2026-07-20",
      reason: "deadline",
      due: true,
    });
  });

  it("breaks ties toward what you owe another person", () => {
    const t = task({ deadlineDateKey: TODAY, respondByDateKey: TODAY });
    expect(nextSurfaceTrigger(t, NOW)?.reason).toBe("respond_by");
  });

  it("marks today's trigger as due, tomorrow's as not", () => {
    expect(nextSurfaceTrigger(task({ deadlineDateKey: TODAY }), NOW)?.due).toBe(true);
    expect(nextSurfaceTrigger(task({ deadlineDateKey: "2026-07-28" }), NOW)?.due).toBe(false);
  });

  it("brings a task parked on someone else back instead of losing it", () => {
    const waitingOn: WaitingOn = {
      personId: null,
      personName: "Sam",
      sinceIso: "2026-07-01T12:00:00", // local noon — unambiguous in any zone
    };
    const trigger = nextSurfaceTrigger(task({ waitingOn }), NOW);
    expect(trigger?.reason).toBe("chase");
    // Repeating cadence: 2026-07-01 + 4 x 7 days lands strictly after today.
    expect(trigger?.dateKey).toBe("2026-07-29");
    expect(CHASE_CHECK_DAYS).toBe(7);
  });

  it("counts 'waiting since' from the local day, not the UTC date string", () => {
    // A UTC-midnight timestamp is the *previous* local day west of Greenwich.
    // Chasing someone should follow the user's calendar, not UTC's.
    const utcMidnight: WaitingOn = {
      personId: null,
      personName: "Sam",
      sinceIso: "2026-07-01T00:00:00.000Z",
    };
    const midnightMs = (key: string) => {
      const [y, m, d] = key.split("-").map(Number);
      return new Date(y, m - 1, d).getTime();
    };
    const instant = new Date("2026-07-01T00:00:00.000Z");
    const localStartKey = `${instant.getFullYear()}-${String(instant.getMonth() + 1).padStart(2, "0")}-${String(instant.getDate()).padStart(2, "0")}`;

    const trigger = nextSurfaceTrigger(task({ waitingOn: utcMidnight }), NOW);
    const elapsed = Math.round(
      (midnightMs(trigger!.dateKey) - midnightMs(localStartKey)) / 86_400_000
    );
    // Whatever the local start day is, the cadence lands a whole number of
    // periods after it — anchored on local time, not the UTC date string.
    expect(elapsed % CHASE_CHECK_DAYS).toBe(0);
    expect(elapsed).toBeGreaterThan(0);
  });

  it("goes dormant only when there is genuinely nothing scheduled", () => {
    const d = disposeTask(task(), NOW);
    expect(d.state).toBe("dormant");
    expect(d.trigger).toBeNull();
    expect(d.ageDays).toBe(7);
  });
});

describe("bad data is reported, never silently swallowed", () => {
  it("flags unreadable dates as faults", () => {
    const faults = taskDataFaults(
      task({ deadlineDateKey: "31-12-2026", respondByDateKey: "", startThinkingAtDateKey: "soon" })
    );
    expect(faults.map((f) => f.field).sort()).toEqual([
      "deadlineDateKey",
      "respondByDateKey",
      "startThinkingAtDateKey",
    ]);
  });

  it("never turns an unreadable date into a bogus trigger", () => {
    expect(nextSurfaceTrigger(task({ deadlineDateKey: "31-12-2026" }), NOW)).toBeNull();
  });

  it("still honours the good dates on a task that also has a bad one", () => {
    const t = task({ deadlineDateKey: "nope", respondByDateKey: "2026-08-02" });
    const d = disposeTask(t, NOW);
    expect(d.state).toBe("triggered");
    expect(d.trigger?.dateKey).toBe("2026-08-02");
    expect(d.faults).toHaveLength(1);
  });
});

describe("time edges", () => {
  it("counts days correctly across a spring-forward DST boundary", () => {
    // 2026-03-08 is the US spring-forward; that calendar day is only 23h long.
    const t = task({ parkedAt: new Date("2026-03-07T12:00:00").getTime() });
    expect(taskAgeDays(t, new Date("2026-03-09T12:00:00"))).toBe(2);
  });

  it("counts days correctly across a fall-back DST boundary", () => {
    // 2026-11-01 is the US fall-back; that calendar day is 25h long.
    const t = task({ parkedAt: new Date("2026-10-31T12:00:00").getTime() });
    expect(taskAgeDays(t, new Date("2026-11-02T12:00:00"))).toBe(2);
  });

  it("treats a trigger as due at one minute past midnight on the day", () => {
    const t = task({ deadlineDateKey: "2026-07-27" });
    expect(nextSurfaceTrigger(t, new Date("2026-07-27T00:01:00"))?.due).toBe(true);
    expect(nextSurfaceTrigger(t, new Date("2026-07-26T23:59:00"))?.due).toBe(false);
  });

  it("never reports a negative age for a future capture time", () => {
    const t = task({ parkedAt: new Date("2027-01-01T00:00:00").getTime() });
    expect(taskAgeDays(t, NOW)).toBe(0);
  });

  it("survives a nonsense parkedAt", () => {
    expect(taskAgeDays(task({ parkedAt: NaN }), NOW)).toBe(0);
    expect(disposeTask(task({ parkedAt: NaN }), NOW).state).toBe("dormant");
  });

  it("handles far-past and far-future dates", () => {
    expect(nextSurfaceTrigger(task({ deadlineDateKey: "1999-01-01" }), NOW)?.due).toBe(true);
    expect(nextSurfaceTrigger(task({ deadlineDateKey: "2099-12-31" }), NOW)?.due).toBe(false);
  });
});

describe("ordering", () => {
  it("returns due work oldest-first, obligations to people ahead of ties", () => {
    const tasks = [
      task({ id: "later", deadlineDateKey: TODAY }),
      task({ id: "oldest", deadlineDateKey: "2026-07-01" }),
      task({ id: "owed", respondByDateKey: TODAY }),
      task({ id: "future", deadlineDateKey: "2026-09-09" }),
    ];
    expect(dueNow(tasks, NOW).map((d) => d.task.id)).toEqual(["oldest", "owed", "later"]);
  });

  it("returns the dormant pile oldest-first for the review sweep", () => {
    const tasks = [
      task({ id: "young", parkedAt: new Date("2026-07-25T09:00:00").getTime() }),
      task({ id: "ancient", parkedAt: new Date("2026-01-05T09:00:00").getTime() }),
      task({ id: "middle", parkedAt: new Date("2026-06-01T09:00:00").getTime() }),
    ];
    expect(dormant(tasks, NOW).map((d) => d.task.id)).toEqual(["ancient", "middle", "young"]);
  });
});
