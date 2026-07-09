import { describe, expect, it } from "vitest";
import {
  appDataRowsFromStore,
  emptyAppDataStore,
  mergeTaskOverlay,
  parseAppDataRows,
  taskToOverlay,
} from "./app-data";

describe("parseAppDataRows", () => {
  it("reads task overlay", () => {
    const store = parseAppDataRows([
      ["Key", "Value"],
      ["task:abc", '{"inToday":true,"subtasks":[]}'],
    ]);
    expect(store.tasks.get("abc")?.inToday).toBe(true);
  });

  it("reads reviews blob", () => {
    const store = parseAppDataRows([
      ["Key", "Value"],
      ["reviews", '{"2026-07-07":{"reflection":"good week","intentions":"ship"}}'],
    ]);
    expect(store.reviews["2026-07-07"]?.reflection).toBe("good week");
  });

  it("reads contacts", () => {
    const store = parseAppDataRows([
      ["Key", "Value"],
      ["contacts", '[{"id":"c1","name":"Sam"}]'],
    ]);
    expect(store.contacts[0]?.name).toBe("Sam");
  });
});

describe("appDataRowsFromStore", () => {
  it("round-trips task overlay", () => {
    const store = emptyAppDataStore();
    store.tasks.set("t1", { inToday: true, subtasks: [] });
    const rows = appDataRowsFromStore(store);
    const back = parseAppDataRows(rows);
    expect(back.tasks.get("t1")?.inToday).toBe(true);
  });

  it("round-trips reviews", () => {
    const store = emptyAppDataStore();
    store.reviews = { "2026-07-07": { reflection: "steady", intentions: "focus" } };
    const back = parseAppDataRows(appDataRowsFromStore(store));
    expect(back.reviews["2026-07-07"]?.intentions).toBe("focus");
  });

  it("round-trips activity log", () => {
    const store = emptyAppDataStore();
    store.activityLog = [
      {
        id: "al-1",
        atIso: "2026-07-09T14:00:00.000Z",
        kind: "session_end",
        taskId: "t1",
        projectId: null,
        startedAtIso: "2026-07-09T13:00:00.000Z",
        durationMs: 3_600_000,
      },
    ];
    const back = parseAppDataRows(appDataRowsFromStore(store));
    expect(back.activityLog).toHaveLength(1);
    expect(back.activityLog[0]?.kind).toBe("session_end");
  });
});

describe("mergeTaskOverlay", () => {
  it("applies person fields", () => {
    const task = {
      id: "t1",
      title: "Call",
      lifeAreaId: "people",
      projectId: null,
      workModeId: null,
      doPlan: null,
      deadlineInDays: null,
      status: "todo" as const,
      inToday: false,
      completedAtInDays: null,
      parkedAt: Date.now(),
      notes: "",
      subtasks: [],
    };
    const merged = mergeTaskOverlay(task, {
      personId: "c1",
      personName: "Sam",
      inToday: true,
    });
    expect(merged.personName).toBe("Sam");
    expect(merged.inToday).toBe(true);
  });

  it("applies completedAtIso", () => {
    const task = {
      id: "t1",
      title: "Done thing",
      lifeAreaId: "music",
      projectId: null,
      workModeId: null,
      doPlan: null,
      deadlineInDays: null,
      status: "done" as const,
      inToday: false,
      completedAtInDays: 0,
      completedAtIso: null,
      parkedAt: Date.now(),
      notes: "",
      subtasks: [],
    };
    const merged = mergeTaskOverlay(task, { completedAtIso: "2026-07-09T14:34:00.000Z" });
    expect(merged.completedAtIso).toBe("2026-07-09T14:34:00.000Z");
  });

  it("applies waitingOn", () => {
    const task = {
      id: "t1",
      title: "Venue reply",
      lifeAreaId: "music",
      projectId: null,
      workModeId: null,
      doPlan: null,
      deadlineInDays: null,
      status: "todo" as const,
      inToday: true,
      completedAtInDays: null,
      parkedAt: Date.now(),
      notes: "",
      subtasks: [],
    };
    const merged = mergeTaskOverlay(task, {
      inToday: false,
      waitingOn: { personId: "c1", personName: "Sam", sinceIso: "2026-07-09T10:00:00.000Z" },
    });
    expect(merged.inToday).toBe(false);
    expect(merged.waitingOn?.personName).toBe("Sam");
  });
});

describe("taskToOverlay", () => {
  it("captures overlay fields", () => {
    const overlay = taskToOverlay({
      id: "t1",
      title: "x",
      lifeAreaId: "",
      projectId: null,
      workModeId: null,
      doPlan: null,
      deadlineInDays: null,
      status: "todo",
      inToday: true,
      completedAtInDays: null,
      parkedAt: 1,
      notes: "",
      subtasks: [{ id: "s1", title: "sub", done: false }],
      personName: "Sam",
    });
    expect(overlay.inToday).toBe(true);
    expect(overlay.subtasks?.length).toBe(1);
  });

  it("includes completedAtIso when set", () => {
    const overlay = taskToOverlay({
      id: "t1",
      title: "x",
      lifeAreaId: "",
      projectId: null,
      workModeId: null,
      doPlan: null,
      deadlineInDays: null,
      status: "done",
      inToday: false,
      completedAtInDays: 0,
      completedAtIso: "2026-07-09T14:34:00.000Z",
      parkedAt: 1,
      notes: "",
      subtasks: [],
    });
    expect(overlay.completedAtIso).toBe("2026-07-09T14:34:00.000Z");
  });

  it("includes waitingOn when set", () => {
    const overlay = taskToOverlay({
      id: "t1",
      title: "x",
      lifeAreaId: "",
      projectId: null,
      workModeId: null,
      doPlan: null,
      deadlineInDays: null,
      status: "todo",
      inToday: false,
      completedAtInDays: null,
      parkedAt: 1,
      notes: "",
      subtasks: [],
      waitingOn: { personId: null, personName: "Sam", sinceIso: "2026-07-09T10:00:00.000Z" },
    });
    expect(overlay.waitingOn?.personName).toBe("Sam");
  });
});
