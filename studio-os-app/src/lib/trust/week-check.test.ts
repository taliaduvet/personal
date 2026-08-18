import { describe, expect, it } from "vitest";
import { unapproveWarning, weekTrustCheck } from "./week-check";
import { dayPlan } from "../do-plan";
import type { Task } from "../types";

// Monday 2026-07-27. Week starts Sunday (weekStartsOn = 0) → Sun 26 … Sat Aug 1.
const NOW = new Date("2026-07-27T12:00:00");
const WEEK_START: 0 = 0;

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: "t",
    title: "A task",
    lifeAreaId: "music",
    projectId: null,
    workModeId: "admin",
    doPlan: null,
    deadlineInDays: null,
    status: "todo",
    inToday: false,
    completedAtInDays: null,
    parkedAt: new Date("2026-07-01T09:00:00").getTime(),
    notes: "",
    subtasks: [],
    ...overrides,
  };
}

describe("the safety net does not depend on the user getting it right", () => {
  it("catches a commitment landing this week that was never approved", () => {
    // The hole in the old check: it only inspected approved tasks, so
    // forgetting to approve something made it invisible.
    const forgot = task({ id: "forgot", deadlineDateKey: "2026-07-30" });
    const check = weekTrustCheck([forgot], [], WEEK_START, NOW);
    expect(check.missing.map((r) => r.task.id)).toEqual(["forgot"]);
    expect(check.covered).toHaveLength(0);
  });

  it("reports an approved commitment as covered rather than missing", () => {
    const planned = task({ id: "planned", deadlineDateKey: "2026-07-30" });
    const check = weekTrustCheck([planned], ["planned"], WEEK_START, NOW);
    expect(check.missing).toHaveLength(0);
    expect(check.covered.map((r) => r.task.id)).toEqual(["planned"]);
  });

  it("suggests every commitment for approval by default", () => {
    const tasks = [
      task({ id: "a", deadlineDateKey: "2026-07-29" }),
      task({ id: "b", respondByDateKey: "2026-07-31" }),
    ];
    expect(weekTrustCheck(tasks, [], WEEK_START, NOW).suggestedIds.sort()).toEqual(["a", "b"]);
  });
});

describe("what counts as a commitment", () => {
  it("includes obligations to other people", () => {
    const tasks = [
      task({ id: "reply", respondByDateKey: "2026-07-29" }),
      task({
        id: "owed",
        waitingOn: {
          personId: null, personName: "Josh",
          sinceIso: "2026-07-20T12:00:00", direction: "me",
        },
      }),
    ];
    const ids = weekTrustCheck(tasks, [], WEEK_START, NOW).missing.map((r) => r.task.id);
    expect(ids).toContain("reply");
    expect(ids).toContain("owed");
  });

  it("excludes the user's own plan — that is Today's job, not a commitment", () => {
    // Planning a task for Wednesday is not an obligation to anyone; treating it
    // as one would recreate the "second Today view" mistake inside planning.
    const planned = task({ id: "mine", doPlan: dayPlan(2, NOW) });
    const check = weekTrustCheck([planned], [], WEEK_START, NOW);
    expect(check.missing).toHaveLength(0);
    expect(check.covered).toHaveLength(0);
  });

  it("ignores a commitment that lands after this week", () => {
    const later = task({ id: "later", deadlineDateKey: "2026-09-01" });
    expect(weekTrustCheck([later], [], WEEK_START, NOW).missing).toHaveLength(0);
  });

  it("still catches something that was already late before the week began", () => {
    // More urgent, not less — dropping it because its date precedes the week
    // would be exactly the silent loss this guards against.
    const late = task({ id: "late", deadlineDateKey: "2026-06-30" });
    const check = weekTrustCheck([late], [], WEEK_START, NOW);
    expect(check.missing).toHaveLength(1);
    expect(check.missing[0]?.alreadyLate).toBe(true);
  });

  it("leaves completed work out of it", () => {
    const done = task({ id: "done", deadlineDateKey: "2026-07-29", status: "done" });
    expect(weekTrustCheck([done], [], WEEK_START, NOW).missing).toHaveLength(0);
  });

  it("orders by what lands soonest", () => {
    const tasks = [
      task({ id: "fri", deadlineDateKey: "2026-07-31" }),
      task({ id: "past", deadlineDateKey: "2026-07-01" }),
      task({ id: "wed", deadlineDateKey: "2026-07-29" }),
    ];
    expect(weekTrustCheck(tasks, [], WEEK_START, NOW).missing.map((r) => r.task.id)).toEqual([
      "past", "wed", "fri",
    ]);
  });
});

describe("un-approving warns, but never blocks", () => {
  it("explains what breaks, naming the person", () => {
    const t = task({
      id: "x",
      waitingOn: {
        personId: null, personName: "Kim",
        sinceIso: "2026-07-20T12:00:00", direction: "me",
      },
    });
    expect(unapproveWarning(t, WEEK_START, NOW)).toBe("Kim is waiting on you.");
  });

  it("distinguishes a deadline this week from one already passed", () => {
    expect(unapproveWarning(task({ deadlineDateKey: "2026-07-31" }), WEEK_START, NOW)).toBe(
      "This has a deadline this week."
    );
    expect(unapproveWarning(task({ deadlineDateKey: "2026-06-30" }), WEEK_START, NOW)).toBe(
      "This deadline has already passed."
    );
  });

  it("says nothing when dropping it is a free choice", () => {
    expect(unapproveWarning(task({ doPlan: dayPlan(2, NOW) }), WEEK_START, NOW)).toBeNull();
    expect(unapproveWarning(task(), WEEK_START, NOW)).toBeNull();
  });

  it("never phrases the warning as a command", () => {
    const samples = [
      unapproveWarning(task({ deadlineDateKey: "2026-07-31" }), WEEK_START, NOW),
      unapproveWarning(task({ respondByDateKey: "2026-07-29" }), WEEK_START, NOW),
    ];
    for (const s of samples) {
      expect(s ?? "").not.toMatch(/you must|you should|don't|do not|need to/i);
    }
  });
});
