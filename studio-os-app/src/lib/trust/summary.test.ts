import { describe, expect, it } from "vitest";
import { overdueLabel, reasonLabel, summarize } from "./summary";
import { dayPlan } from "../do-plan";
import type { Task } from "../types";

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

describe("all-clear", () => {
  it("is true when nothing needs you — including with a big dormant pile", () => {
    // The dormant pile must not block the all-clear. Parked work is safe by
    // definition; treating it as outstanding would mean the user never gets to
    // exhale, which defeats the product.
    const tasks = [
      task({ id: "a" }),
      task({ id: "b" }),
      task({ id: "c", parkedAt: new Date("2025-01-01T09:00:00").getTime() }),
    ];
    const s = summarize(tasks, NOW);
    expect(s.allClear).toBe(true);
    expect(s.dormantCount).toBe(3);
    expect(s.needsYou).toHaveLength(0);
  });

  it("is true for an empty database on day one", () => {
    const s = summarize([], NOW);
    expect(s.allClear).toBe(true);
    expect(s.heldCount).toBe(0);
  });

  it("is false the moment something is actually due", () => {
    const s = summarize([task({ deadlineDateKey: TODAY })], NOW);
    expect(s.allClear).toBe(false);
    expect(s.needsYou).toHaveLength(1);
  });

  it("is false when unreadable data means it can't be sure", () => {
    // Principle 9: never look fine while degraded.
    const s = summarize([task({ deadlineDateKey: "31-12-2026" })], NOW);
    expect(s.allClear).toBe(false);
    expect(s.faultCount).toBe(1);
  });

  it("is false when finished work was never delivered", () => {
    const s = summarize(
      [
        task({
          status: "done",
          completedAtIso: "2026-07-25T10:00:00.000Z",
          waitingOn: { personId: null, personName: "Kim", sinceIso: "2026-07-01T12:00:00", direction: "me" },
        }),
      ],
      NOW
    );
    expect(s.allClear).toBe(false);
    expect(s.awaitingDelivery).toHaveLength(1);
  });

  it("counts only active work as held", () => {
    const s = summarize([task({ id: "a" }), task({ id: "b", status: "done" })], NOW);
    expect(s.heldCount).toBe(1);
  });
});

describe("what surfaces", () => {
  it("lists due work but only counts the dormant pile", () => {
    const tasks = [
      task({ id: "due", deadlineDateKey: TODAY }),
      task({ id: "sleeping1" }),
      task({ id: "sleeping2" }),
    ];
    const s = summarize(tasks, NOW);
    expect(s.needsYou.map((d) => d.task.id)).toEqual(["due"]);
    expect(s.dormantCount).toBe(2);
  });

  it("reports the oldest dormant age for the review sweep", () => {
    const tasks = [
      task({ id: "young", parkedAt: new Date("2026-07-25T09:00:00").getTime() }),
      task({ id: "old", parkedAt: new Date("2026-05-27T09:00:00").getTime() }),
    ];
    expect(summarize(tasks, NOW).oldestDormantDays).toBe(61);
  });

  it("does not treat a future-dated task as needing you now", () => {
    const s = summarize([task({ deadlineDateKey: "2026-09-01" })], NOW);
    expect(s.needsYou).toHaveLength(0);
    expect(s.allClear).toBe(true);
  });
});

describe("language stays informational, never imperative", () => {
  it("names the person for obligations in both directions", () => {
    const owed = task({
      waitingOn: { personId: null, personName: "Josh", sinceIso: "2026-07-01T12:00:00", direction: "me" },
    });
    expect(reasonLabel("owed", owed)).toBe("Josh is waiting on you");

    const blocked = task({
      waitingOn: { personId: null, personName: "Sam", sinceIso: "2026-07-01T12:00:00", direction: "them" },
    });
    expect(reasonLabel("chase", blocked)).toBe("Sam has been quiet");
  });

  it("degrades gracefully when there is no name", () => {
    expect(reasonLabel("owed", task())).toBe("someone is waiting on you");
    expect(reasonLabel("respond_by", task())).toBe("reply owed");
  });

  it("uses invitational wording for starting, not a command", () => {
    expect(reasonLabel("start_thinking", task())).toBe("worth starting");
  });

  it("covers every reason with a label", () => {
    const reasons = [
      "respond_by", "owed", "handoff", "deadline",
      "start_thinking", "planned", "recurring", "chase",
    ] as const;
    for (const r of reasons) {
      expect(reasonLabel(r, task()).length).toBeGreaterThan(0);
    }
  });
});

describe("overdue phrasing is a fact, not a scolding", () => {
  it("returns nothing when not overdue", () => {
    expect(overdueLabel(TODAY, TODAY)).toBeNull();
    expect(overdueLabel("2026-08-01", TODAY)).toBeNull();
  });

  it("scales the unit with the gap", () => {
    expect(overdueLabel("2026-07-26", TODAY)).toBe("since yesterday");
    expect(overdueLabel("2026-07-22", TODAY)).toBe("5 days ago");
    expect(overdueLabel("2026-07-06", TODAY)).toBe("3 weeks ago");
    expect(overdueLabel("2026-04-27", TODAY)).toBe("3 months ago");
  });

  it("never uses blaming words", () => {
    const samples = ["2026-07-26", "2026-07-20", "2026-06-01", "2026-01-01"]
      .map((d) => overdueLabel(d, TODAY) ?? "");
    for (const s of samples) {
      expect(s).not.toMatch(/late|overdue|failed|behind|should|must/i);
    }
  });
});

describe("the trust core is a safety net, not a second Today view", () => {
  it("leaves work planned for today to Today, and stays all-clear", () => {
    // The failure this guards against: showing the user their own plan back
    // under an alarming heading, which buries real risk in routine work.
    const tasks = [
      task({ id: "a", doPlan: dayPlan(0, NOW) }),
      task({ id: "b", doPlan: dayPlan(0, NOW) }),
    ];
    const s = summarize(tasks, NOW);
    expect(s.needsYou).toHaveLength(0);
    expect(s.scheduledToday.map((d) => d.task.id)).toEqual(["a", "b"]);
    expect(s.allClear).toBe(true);
  });

  it("treats a plan that slipped off Today as quiet information, not an alarm", () => {
    // §6.1 — a "doing by" slipping is information; only deadlines alarm.
    const s = summarize([task({ id: "old", doPlan: dayPlan(-9, NOW) })], NOW);
    expect(s.slipped.map((d) => d.task.id)).toEqual(["old"]);
    expect(s.needsYou).toHaveLength(0);
    expect(s.allClear).toBe(true);
  });

  it("still raises a real deadline that happens to be planned for today", () => {
    const s = summarize([task({ deadlineDateKey: TODAY, doPlan: dayPlan(0, NOW) })], NOW);
    expect(s.needsYou).toHaveLength(1);
    expect(s.allClear).toBe(false);
  });

  it("raises a recurring obligation that was never planned in", () => {
    // Nothing else would surface it: it isn't on Today, so without this it
    // would simply be missed.
    const s = summarize([task({ recurrence: { kind: "daily" }, doPlan: dayPlan(-1, NOW) })], NOW);
    expect(s.slipped.length + s.needsYou.length).toBeGreaterThan(0);
  });

  it("keeps the header count to genuine risk only", () => {
    const tasks = [
      task({ id: "risk", deadlineDateKey: TODAY }),
      task({ id: "today1", doPlan: dayPlan(0, NOW) }),
      task({ id: "today2", doPlan: dayPlan(0, NOW) }),
      task({ id: "slip", doPlan: dayPlan(-4, NOW) }),
    ];
    const s = summarize(tasks, NOW);
    expect(s.needsYou).toHaveLength(1);
    expect(s.scheduledToday).toHaveLength(2);
    expect(s.slipped).toHaveLength(1);
  });
});
