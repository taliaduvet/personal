import { describe, expect, it } from "vitest";
import { nextOccurrenceOffset, recurrenceLabel, spawnNextRecurringTask } from "./recurrence";
import type { Task } from "./types"
import { dayPlan } from "./do-plan";

// Sunday, July 12 2026, noon local.
const now = new Date("2026-07-12T12:00:00");

const task = (overrides: Partial<Task> & Pick<Task, "id">): Task => ({
  title: "Water plants",
  lifeAreaId: "home",
  projectId: null,
  workModeId: null,
  doPlan: dayPlan(0, now),
  deadlineInDays: null,
  status: "todo",
  inToday: true,
  completedAtInDays: null,
  parkedAt: 0,
  notes: "",
  subtasks: [],
  recurrence: { kind: "daily" },
  ...overrides,
});

describe("nextOccurrenceOffset", () => {
  it("daily → tomorrow", () => {
    expect(nextOccurrenceOffset({ kind: "daily" }, dayPlan(0, now), now)).toBe(1);
  });

  it("weekdays skips the weekend", () => {
    // now is Sunday → next weekday is Monday (offset 1)
    expect(nextOccurrenceOffset({ kind: "weekdays" }, null, now)).toBe(1);
    // From Friday, next weekday is Monday (offset 3)
    const friday = new Date("2026-07-10T12:00:00");
    expect(nextOccurrenceOffset({ kind: "weekdays" }, null, friday)).toBe(3);
  });

  it("weekly lands a week after the do-date, always in the future", () => {
    expect(nextOccurrenceOffset({ kind: "weekly" }, dayPlan(0, now), now)).toBe(7);
    // Do-date was 10 days ago → next weekly slot after today is offset 4
    expect(nextOccurrenceOffset({ kind: "weekly" }, dayPlan(-10, now), now)).toBe(4);
  });

  it("everyNDays rolls forward past today", () => {
    expect(nextOccurrenceOffset({ kind: "everyNDays", n: 14 }, dayPlan(0, now), now)).toBe(14);
    // Anchor 30 days back, n=14 → occurrences at -16, -2, +12
    expect(nextOccurrenceOffset({ kind: "everyNDays", n: 14 }, dayPlan(-30, now), now)).toBe(12);
  });

  it("monthly keeps the day-of-month, clamped to month length", () => {
    // Jul 12 → Aug 12 is 31 days away
    expect(nextOccurrenceOffset({ kind: "monthly" }, dayPlan(0, now), now)).toBe(31);
    // Jul 31 anchor → Aug 31 exists (31 days from Jul 31)
    const jul31 = new Date("2026-07-31T12:00:00");
    expect(nextOccurrenceOffset({ kind: "monthly" }, dayPlan(0, jul31), jul31)).toBe(31);
  });
});

describe("spawnNextRecurringTask", () => {
  it("resets state and lines up the next occurrence", () => {
    const done = task({
      id: "t1",
      status: "done",
      completedAtInDays: 0,
      completedAtIso: "2026-07-12T19:00:00.000Z",
      subtasks: [{ id: "s1", title: "front room", done: true }],
      lastReentryNote: "half done",
      waitingOn: { personId: null, personName: "Sam", sinceIso: "2026-07-10T00:00:00.000Z" },
    });
    const next = spawnNextRecurringTask(done, "t2", now);
    expect(next.id).toBe("t2");
    expect(next.status).toBe("todo");
    expect(next.inToday).toBe(false);
    expect(next.doPlan).toEqual(dayPlan(1, now));
    expect(next.completedAtInDays).toBeNull();
    expect(next.completedAtIso).toBeNull();
    expect(next.subtasks[0]).toMatchObject({ title: "front room", done: false });
    expect(next.subtasks[0]!.id).not.toBe("s1");
    expect(next.lastReentryNote).toBeNull();
    expect(next.waitingOn).toBeNull();
    expect(next.recurrence).toEqual({ kind: "daily" });
  });
});

describe("recurrenceLabel", () => {
  it("labels each kind", () => {
    expect(recurrenceLabel({ kind: "daily" })).toBe("Every day");
    expect(recurrenceLabel({ kind: "everyNDays", n: 14 })).toBe("Every 2 weeks");
    expect(recurrenceLabel({ kind: "everyNDays", n: 3 })).toBe("Every 3 days");
    expect(recurrenceLabel(null)).toBeNull();
  });
});
