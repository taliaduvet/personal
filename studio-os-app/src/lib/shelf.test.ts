import { describe, expect, it } from "vitest";
import { groupShippedByMonth, shippedTasks } from "./shelf";
import type { Task } from "./types";

function done(partial: Partial<Task> & Pick<Task, "id" | "title">): Task {
  return {
    lifeAreaId: "music",
    projectId: null,
    workModeId: null,
    doPlan: null,
    deadlineInDays: null,
    status: "done",
    inToday: false,
    completedAtInDays: 0,
    parkedAt: Date.now(),
    notes: "",
    subtasks: [],
    ...partial,
  };
}

describe("shippedTasks", () => {
  it("sorts newest first by completedAtIso", () => {
    const list = shippedTasks([
      done({ id: "a", title: "A", completedAtIso: "2026-07-01T10:00:00.000Z" }),
      done({ id: "b", title: "B", completedAtIso: "2026-07-08T10:00:00.000Z" }),
      { ...done({ id: "c", title: "C" }), status: "todo" },
    ]);
    expect(list.map((t) => t.id)).toEqual(["b", "a"]);
  });
});

describe("groupShippedByMonth", () => {
  it("groups by calendar month", () => {
    const groups = groupShippedByMonth([
      done({ id: "a", title: "A", completedAtIso: "2026-07-02T10:00:00.000Z" }),
      done({ id: "b", title: "B", completedAtIso: "2026-06-15T10:00:00.000Z" }),
    ]);
    expect(groups).toHaveLength(2);
    expect(groups[0]?.key).toBe("2026-07");
    expect(groups[0]?.tasks).toHaveLength(1);
  });
});
