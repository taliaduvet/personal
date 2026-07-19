import { describe, expect, it } from "vitest";
import { buildExportSpec, type ExportInput } from "./export";
import type { Task } from "@/lib/types"
import { dayPlan } from "@/lib/do-plan";

const now = new Date("2026-07-12T12:00:00");

const task = (overrides: Partial<Task> & Pick<Task, "id" | "title">): Task => ({
  lifeAreaId: "music",
  projectId: null,
  workModeId: null,
  doPlan: null,
  deadlineInDays: null,
  status: "todo",
  inToday: false,
  completedAtInDays: null,
  parkedAt: 0,
  notes: "",
  subtasks: [],
  ...overrides,
});

const baseInput = (overrides: Partial<ExportInput> = {}): ExportInput => ({
  tasks: [],
  projects: [],
  recipes: [],
  activityLog: [],
  reviewNotes: {},
  logbookLines: {},
  lifeAreas: [{ id: "music", name: "Music", color: "#5B61E8" }],
  ...overrides,
});

describe("buildExportSpec", () => {
  it("titles the export with the export date and emits all tabs", () => {
    const spec = buildExportSpec(baseInput(), now);
    expect(spec.title).toBe("Studio OS Export — 2026-07-12");
    expect(spec.tabs.map((t) => t.title)).toEqual([
      "Tasks",
      "Projects",
      "Sessions",
      "Weekly Reviews",
      "Logbook",
      "Recipes",
    ]);
  });

  it("renders tasks with resolved names and absolute dates", () => {
    const spec = buildExportSpec(
      baseInput({
        tasks: [
          task({
            id: "t1",
            title: "Master the single",
            projectId: "p1",
            deadlineInDays: 3,
            doPlan: dayPlan(1, now),
            subtasks: [
              { id: "s1", title: "bounce stems", done: true },
              { id: "s2", title: "limiter pass", done: false },
            ],
          }),
          task({ id: "t-blank", title: "  " }),
        ],
        projects: [{ id: "p1", name: "Spring EP", lifeAreaId: "music", why: "Ship it" }],
      }),
      now
    );

    const tasksTab = spec.tabs[0]!;
    expect(tasksTab.rows).toHaveLength(2); // header + 1 (blank task skipped)
    const row = tasksTab.rows[1]!;
    expect(row[0]).toBe("Master the single");
    expect(row[2]).toBe("Music");
    expect(row[3]).toBe("Spring EP");
    expect(row[4]).toBe("2026-07-13");
    expect(row[5]).toBe("2026-07-15");
    expect(row[10]).toBe("[x] bounce stems; [ ] limiter pass");
  });

  it("renders session entries with durations and task titles", () => {
    const spec = buildExportSpec(
      baseInput({
        tasks: [task({ id: "t1", title: "Mix" })],
        activityLog: [
          {
            id: "e1",
            atIso: "2026-07-10T18:30:00.000Z",
            kind: "session_end",
            taskId: "t1",
            projectId: null,
            startedAtIso: "2026-07-10T17:00:00.000Z",
            durationMs: 5_400_000,
            reentryNote: "vocals up next",
          },
          { id: "e2", atIso: "2026-07-10T19:00:00.000Z", kind: "session_start", taskId: "t1", projectId: null },
        ],
      }),
      now
    );

    const sessions = spec.tabs[2]!;
    expect(sessions.rows).toHaveLength(2); // header + session_end (start filtered)
    const row = sessions.rows[1]!;
    expect(row[1]).toBe("session");
    expect(row[2]).toBe("Mix");
    expect(row[3]).toBe("1.5h");
    expect(row[4]).toBe("vocals up next");
  });
});
