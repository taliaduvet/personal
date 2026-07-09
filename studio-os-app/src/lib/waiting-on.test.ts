import { describe, expect, it } from "vitest";
import {
  isWaitingTask,
  needsNudge,
  nudgeCopyText,
  quietDaysSince,
  quietLabel,
  waitingTasks,
} from "./waiting-on";
import type { Task } from "./types";

function task(partial: Partial<Task> & Pick<Task, "id" | "title">): Task {
  return {
    lifeAreaId: "music",
    projectId: null,
    workModeId: null,
    doPlan: null,
    deadlineInDays: null,
    status: "todo",
    inToday: false,
    completedAtInDays: null,
    parkedAt: Date.now(),
    notes: "",
    subtasks: [],
    ...partial,
  };
}

describe("quietDaysSince", () => {
  it("counts days since waiting started", () => {
    const now = new Date("2026-07-09T12:00:00");
    const t = task({
      id: "t1",
      title: "Venue reply",
      waitingOn: { personId: null, personName: "Sam", sinceIso: "2026-07-07T10:00:00.000Z" },
    });
    expect(quietDaysSince(t, now)).toBe(2);
    expect(quietLabel(quietDaysSince(t, now))).toBe("quiet 2 days");
  });
});

describe("needsNudge", () => {
  it("nudges after 7 days", () => {
    const now = new Date("2026-07-09T12:00:00");
    const t = task({
      id: "t1",
      title: "Artwork",
      waitingOn: { personId: null, personName: "Marcus", sinceIso: "2026-07-01T10:00:00.000Z" },
    });
    expect(needsNudge(t, now)).toBe(true);
    expect(nudgeCopyText(t)).toContain("Marcus");
    expect(nudgeCopyText(t)).toContain("Artwork");
  });
});

describe("waitingTasks", () => {
  it("sorts longest quiet first", () => {
    const list = waitingTasks([
      task({
        id: "a",
        title: "A",
        waitingOn: { personId: null, personName: "A", sinceIso: "2026-07-08T10:00:00.000Z" },
      }),
      task({
        id: "b",
        title: "B",
        waitingOn: { personId: null, personName: "B", sinceIso: "2026-07-01T10:00:00.000Z" },
      }),
      task({ id: "c", title: "C" }),
    ]);
    expect(list.map((t) => t.id)).toEqual(["b", "a"]);
    expect(isWaitingTask(list[0]!)).toBe(true);
  });
});
