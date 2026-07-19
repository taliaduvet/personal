import { describe, expect, it } from "vitest";
import type { Task } from "./types";
import {
  RESPOND_STRIP_MAX,
  isNeedsRespondTask,
  isRespondOnTodayRail,
  scoreNeedsRespond,
  topNeedsRespond,
} from "./needs-respond";

function base(partial: Partial<Task> & Pick<Task, "id" | "title">): Task {
  return {
    lifeAreaId: "people",
    projectId: null,
    workModeId: null,
    doPlan: null,
    deadlineInDays: null,
    status: "todo",
    inToday: false,
    completedAtInDays: null,
    parkedAt: Date.now() - 86_400_000,
    notes: "",
    subtasks: [],
    needsRespond: true,
    ...partial,
  };
}

describe("needs-respond", () => {
  it("ignores done and non-flagged tasks", () => {
    expect(isNeedsRespondTask(base({ id: "a", title: "x", needsRespond: false }))).toBe(false);
    expect(isNeedsRespondTask(base({ id: "b", title: "y", status: "done" }))).toBe(false);
    expect(isNeedsRespondTask(base({ id: "c", title: "z" }))).toBe(true);
  });

  it("scores overdue respond-by above fresh undated", () => {
    const from = new Date("2026-07-15T12:00:00");
    const overdue = base({
      id: "o",
      title: "old",
      respondByDateKey: "2026-07-14",
      parkedAt: from.getTime() - 2 * 86_400_000,
    });
    const fresh = base({
      id: "f",
      title: "new",
      respondByDateKey: null,
      parkedAt: from.getTime(),
    });
    expect(scoreNeedsRespond(overdue, { from })).toBeGreaterThan(scoreNeedsRespond(fresh, { from }));
  });

  it("boosts VIP name in text", () => {
    const from = new Date("2026-07-15T12:00:00");
    const vip = base({
      id: "v",
      title: "Need Elise review",
      respondByDateKey: "2026-07-16",
      parkedAt: from.getTime(),
    });
    const plain = base({
      id: "p",
      title: "Need review",
      respondByDateKey: "2026-07-16",
      parkedAt: from.getTime(),
    });
    expect(scoreNeedsRespond(vip, { from, vipNames: ["Elise"] })).toBeGreaterThan(
      scoreNeedsRespond(plain, { from, vipNames: ["Elise"] })
    );
  });

  it("caps top strip", () => {
    const tasks = Array.from({ length: 5 }, (_, i) =>
      base({
        id: `t${i}`,
        title: `m${i}`,
        respondByDateKey: "2026-07-15",
        parkedAt: Date.now() - i * 1000,
      })
    );
    expect(topNeedsRespond(tasks, RESPOND_STRIP_MAX)).toHaveLength(3);
  });

  it("parks deferred future replies off Today's rail", () => {
    const from = new Date("2026-07-15T12:00:00");
    const deferred = base({
      id: "d",
      title: "later",
      respondByDateKey: "2026-07-17",
      urgencyReason: "Deferred — come back 2026-07-17",
      parkedAt: from.getTime(),
    });
    const fresh = base({
      id: "f",
      title: "fresh",
      respondByDateKey: "2026-07-16",
      parkedAt: from.getTime(),
    });

    expect(isRespondOnTodayRail(deferred, from)).toBe(false);
    expect(isRespondOnTodayRail(fresh, from)).toBe(true);
    expect(isRespondOnTodayRail(deferred, new Date("2026-07-17T12:00:00"))).toBe(true);
  });
});
