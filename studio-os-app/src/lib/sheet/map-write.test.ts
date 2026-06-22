import { describe, expect, it } from "vitest";
import { taskToSheetRow, isSheetTaskId } from "./map-write";
import type { Task } from "@/lib/types";

const PROJECTS = [
  { id: "proj-1", name: "Spring EP", lifeAreaId: "music", why: null },
];

const BASE: Task = {
  id: "b2bd39e8-6eb0-40b1-911b-6c8e1f09275f",
  title: "Master track",
  lifeAreaId: "music",
  projectId: "proj-1",
  workModeId: "creative",
  doPlan: { kind: "day", offset: 2 },
  deadlineInDays: 5,
  status: "in_progress",
  inToday: false,
  completedAtInDays: null,
  parkedAt: Date.UTC(2026, 5, 10),
  notes: "v3 mix",
  subtasks: [],
  sheetMeta: { priority: "High", goal: "Release EP", eventId: "deadline:abc" },
};

describe("taskToSheetRow", () => {
  it("maps core fields and preserves sheet-only meta", () => {
    const row = taskToSheetRow(BASE, PROJECTS, 1);
    expect(row[0]).toBe("Master track");
    expect(row[1]).toBe("Release");
    expect(row[2]).toBe("Spring EP");
    expect(row[3]).toBe("High");
    expect(row[7]).toBe("In progress");
    expect(row[8]).toBe("v3 mix");
    expect(row[10]).toBe("Release EP");
    expect(row[11]).toBe("deadline:abc");
    expect(row[12]).toBe(BASE.id);
    expect(row[6]).toBeTruthy();
    expect(typeof row[4]).toBe("number");
  });

  it("clears completed date when not done", () => {
    const row = taskToSheetRow({ ...BASE, status: "todo" }, PROJECTS, 1);
    expect(row[14]).toBe("");
  });
});

describe("isSheetTaskId", () => {
  it("accepts uuid v4", () => {
    expect(isSheetTaskId("b2bd39e8-6eb0-40b1-911b-6c8e1f09275f")).toBe(true);
  });

  it("rejects local ids", () => {
    expect(isSheetTaskId("t-123-abc")).toBe(false);
  });
});
