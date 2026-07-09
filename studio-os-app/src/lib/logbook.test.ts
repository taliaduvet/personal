import { describe, expect, it } from "vitest";
import { composeDayPage } from "./logbook";
import type { Task } from "./types";

describe("composeDayPage", () => {
  it("includes shipped and session entries for a day", () => {
    const tasks: Task[] = [
      {
        id: "t1",
        title: "Mix vocals",
        lifeAreaId: "music",
        projectId: null,
        workModeId: "creative",
        doPlan: null,
        deadlineInDays: null,
        status: "done",
        inToday: false,
        completedAtInDays: 0,
        completedAtIso: "2026-07-09T16:00:00.000Z",
        parkedAt: 1,
        notes: "",
        subtasks: [],
      },
    ];
    const page = composeDayPage(
      "2026-07-09",
      tasks,
      [
        {
          id: "al-1",
          atIso: "2026-07-09T14:00:00.000Z",
          kind: "session_end",
          taskId: "t1",
          projectId: null,
          startedAtIso: "2026-07-09T13:00:00.000Z",
          durationMs: 3_600_000,
          reentryNote: "Left at chorus",
        },
        {
          id: "al-2",
          atIso: "2026-07-09T16:00:00.000Z",
          kind: "task_complete",
          taskId: "t1",
          completedAtIso: "2026-07-09T16:00:00.000Z",
          attribution: "unplaced",
        },
      ],
      {},
      { "2026-07-09": "Good studio day" },
      0
    );
    expect(page.userLine).toBe("Good studio day");
    expect(page.sections.some((s) => s.kind === "session")).toBe(true);
    expect(page.sections.some((s) => s.kind === "shipped")).toBe(true);
  });
});
