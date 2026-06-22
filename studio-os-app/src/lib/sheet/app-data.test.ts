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
});
