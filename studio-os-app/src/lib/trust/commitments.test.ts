import { describe, expect, it } from "vitest";
import {
  CHASE_CHECK_DAYS,
  HANDOFF_LEAD_DAYS,
  OWED_CHECK_DAYS,
  commitmentPerson,
  derivedHandoffDeadline,
  handoffRisks,
  isBlockedOnSomeone,
  isOwedToSomeone,
  isProtectedCommitment,
  needsDelivery,
  nextCommitmentCheck,
  nextRecurringCheck,
  pendingDelivery,
  waitingDirection,
} from "./commitments";
import type { Task, WaitingOn } from "../types";

const NOW = new Date("2026-07-27T12:00:00");

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

const waiting = (over: Partial<WaitingOn> = {}): WaitingOn => ({
  personId: null,
  personName: "Sam",
  sinceIso: "2026-07-01T12:00:00",
  ...over,
});

describe("which way the obligation runs", () => {
  it("defaults legacy rows to 'them' — the old meaning of waitingOn", () => {
    const t = task({ waitingOn: waiting() });
    expect(waitingDirection(t)).toBe("them");
    expect(isBlockedOnSomeone(t)).toBe(true);
    expect(isOwedToSomeone(t)).toBe(false);
  });

  it("recognises someone waiting on you", () => {
    const t = task({ waitingOn: waiting({ direction: "me" }) });
    expect(isOwedToSomeone(t)).toBe(true);
    expect(isBlockedOnSomeone(t)).toBe(false);
  });

  it("ignores a blank person", () => {
    expect(waitingDirection(task({ waitingOn: waiting({ personName: "  " }) }))).toBeNull();
  });
});

describe("what counts as a protected commitment", () => {
  it("counts someone waiting on you", () => {
    expect(isProtectedCommitment(task({ waitingOn: waiting({ direction: "me" }) }))).toBe(true);
  });

  it("counts a reply you owe", () => {
    expect(isProtectedCommitment(task({ needsRespond: true }))).toBe(true);
  });

  it("counts dated work with a person attached", () => {
    expect(
      isProtectedCommitment(task({ personName: "Kim", deadlineDateKey: "2026-08-01" }))
    ).toBe(true);
  });

  it("does not count undated work merely mentioning a person", () => {
    expect(isProtectedCommitment(task({ personName: "Kim" }))).toBe(false);
  });

  it("does not count finished work", () => {
    expect(
      isProtectedCommitment(task({ status: "done", waitingOn: waiting({ direction: "me" }) }))
    ).toBe(false);
  });

  it("finds the person from either field", () => {
    expect(commitmentPerson(task({ waitingOn: waiting({ personName: "Sam" }) }))).toBe("Sam");
    expect(commitmentPerson(task({ personName: "Kim" }))).toBe("Kim");
    expect(commitmentPerson(task())).toBeNull();
  });
});

describe("repeating check-ins", () => {
  it("always lands strictly in the future so it never sticks overdue", () => {
    // A one-shot "since + N" would sit permanently overdue and stop being a
    // check-in at all. This is the regression that matters most here.
    const next = nextRecurringCheck("2026-07-01", 7, "2026-07-27");
    expect(next).toBe("2026-07-29");
  });

  it("advances a period at a time as the weeks pass", () => {
    expect(nextRecurringCheck("2026-07-01", 7, "2026-07-01")).toBe("2026-07-08");
    expect(nextRecurringCheck("2026-07-01", 7, "2026-07-07")).toBe("2026-07-08");
    expect(nextRecurringCheck("2026-07-01", 7, "2026-07-08")).toBe("2026-07-15");
  });

  it("handles a start date in the future", () => {
    expect(nextRecurringCheck("2026-08-01", 7, "2026-07-27")).toBe("2026-08-08");
  });

  it("rejects nonsense input rather than inventing a date", () => {
    expect(nextRecurringCheck("nope", 7, "2026-07-27")).toBeNull();
    expect(nextRecurringCheck("2026-07-01", 0, "2026-07-27")).toBeNull();
    expect(nextRecurringCheck("2026-07-01", -3, "2026-07-27")).toBeNull();
  });

  it("chases someone else on a looser loop than it nudges you", () => {
    expect(OWED_CHECK_DAYS).toBeLessThan(CHASE_CHECK_DAYS);
    const owed = nextCommitmentCheck(
      task({ waitingOn: waiting({ direction: "me", sinceIso: "2026-07-26T12:00:00" }) }),
      NOW
    );
    const chase = nextCommitmentCheck(
      task({ waitingOn: waiting({ direction: "them", sinceIso: "2026-07-26T12:00:00" }) }),
      NOW
    );
    expect(owed).toBe("2026-07-29"); // +3
    expect(chase).toBe("2026-08-02"); // +7
  });
});

describe("derived handoff deadlines", () => {
  it("propagates your deadline backwards onto the person you're blocked on", () => {
    // The doc's worked example: grant due the 14th needs Sam's letter → the 7th.
    const t = task({ waitingOn: waiting(), deadlineDateKey: "2026-08-14" });
    expect(derivedHandoffDeadline(t)).toBe("2026-08-07");
    expect(HANDOFF_LEAD_DAYS).toBe(7);
  });

  it("does not invent one when nobody is blocking you", () => {
    expect(derivedHandoffDeadline(task({ deadlineDateKey: "2026-08-14" }))).toBeNull();
  });

  it("does not invent one without a real deadline of your own", () => {
    expect(derivedHandoffDeadline(task({ waitingOn: waiting() }))).toBeNull();
  });

  it("is not derived for someone waiting on you — that is your job, not theirs", () => {
    const t = task({ waitingOn: waiting({ direction: "me" }), deadlineDateKey: "2026-08-14" });
    expect(derivedHandoffDeadline(t)).toBeNull();
  });

  it("flags a handoff whose date has passed as overdue, soonest first", () => {
    const tasks = [
      task({ id: "later", waitingOn: waiting({ personName: "Kim" }), deadlineDateKey: "2026-09-01" }),
      task({ id: "urgent", waitingOn: waiting({ personName: "Sam" }), deadlineDateKey: "2026-07-30" }),
    ];
    const risks = handoffRisks(tasks, NOW);
    expect(risks.map((r) => r.task.id)).toEqual(["urgent", "later"]);
    expect(risks[0]).toMatchObject({
      person: "Sam",
      theirDeadline: "2026-07-23",
      yourDeadline: "2026-07-30",
      overdue: true,
    });
    expect(risks[1].overdue).toBe(false);
  });
});

describe("loop closing — finishing is not telling", () => {
  it("flags finished work that the person was never told about", () => {
    expect(needsDelivery(task({ status: "done", personName: "Kim" }))).toBe(true);
  });

  it("clears once delivered", () => {
    expect(
      needsDelivery(
        task({ status: "done", personName: "Kim", deliveredAt: "2026-07-27T10:00:00.000Z" })
      )
    ).toBe(false);
  });

  it("does not chase delivery on work with nobody attached", () => {
    expect(needsDelivery(task({ status: "done" }))).toBe(false);
  });

  it("does not chase delivery before the work is finished", () => {
    expect(needsDelivery(task({ personName: "Kim" }))).toBe(false);
  });

  it("collects everything awaiting a handoff", () => {
    const tasks = [
      task({ id: "a", status: "done", personName: "Kim" }),
      task({ id: "b", status: "done" }),
      task({ id: "c", status: "done", waitingOn: waiting({ personName: "Sam" }) }),
    ];
    expect(pendingDelivery(tasks).map((t) => t.id)).toEqual(["a", "c"]);
  });
});
