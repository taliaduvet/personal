import { describe, expect, it } from "vitest";
import type { Task } from "./types";
import { scoreNeedsRespond, topNeedsRespond, respondByOffset } from "./needs-respond";

function task( partial: Partial<Task> & Pick<Task, "id" | "title">): Task {
  return {
    lifeAreaId: "people",
    projectId: null,
    workModeId: null,
    doPlan: null,
    deadlineDateKey: null,
    deadlineInDays: null,
    status: "todo",
    inToday: false,
    completedAtInDays: null,
    parkedAt: Date.parse("2026-07-14T12:00:00"),
    notes: "",
    subtasks: [],
    needsRespond: true,
    respondByDateKey: "2026-07-16",
    source: "iphone_share",
    ...partial,
  };
}

describe("needs-respond scoring", () => {
  const from = new Date("2026-07-15T15:00:00");

  it("scores overdue highest", () => {
    const overdue = task({ id: "a", title: "a", respondByDateKey: "2026-07-14" });
    const tomorrow = task({ id: "b", title: "b", respondByDateKey: "2026-07-16" });
    expect(scoreNeedsRespond(overdue, { from })).toBeGreaterThan(
      scoreNeedsRespond(tomorrow, { from })
    );
  });

  it("topNeedsRespond prefers overdue then today", () => {
    const items = [
      task({ id: "later", title: "later", respondByDateKey: "2026-07-20" }),
      task({ id: "over", title: "over", respondByDateKey: "2026-07-13" }),
      task({ id: "tom", title: "tom", respondByDateKey: "2026-07-16" }),
    ];
    const top = topNeedsRespond(items, 2, { from });
    expect(top.map((t) => t.id)).toEqual(["over", "tom"]);
  });

  it("respondByOffset negative when overdue", () => {
    expect(respondByOffset(task({ id: "x", title: "x", respondByDateKey: "2026-07-14" }), from)).toBe(
      -1
    );
  });
});
