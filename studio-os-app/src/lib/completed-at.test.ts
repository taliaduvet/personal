import { describe, expect, it } from "vitest";
import { formatLiftedTime, isCompletedOnDay, isLiftedToday } from "./completed-at";
import type { Task } from "./types";

const baseTask = (patch: Partial<Task> = {}): Task => ({
  id: "t1",
  title: "Test",
  lifeAreaId: "music",
  projectId: null,
  workModeId: null,
  doPlan: null,
  deadlineInDays: null,
  status: "done",
  inToday: false,
  completedAtInDays: 0,
  parkedAt: 0,
  notes: "",
  subtasks: [],
  ...patch,
});

describe("isCompletedOnDay", () => {
  it("matches local today", () => {
    const iso = new Date().toISOString();
    expect(isCompletedOnDay(iso, 0)).toBe(true);
  });
});

describe("isLiftedToday", () => {
  it("uses ISO when present", () => {
    expect(isLiftedToday(baseTask({ completedAtIso: new Date().toISOString() }))).toBe(true);
  });

  it("falls back to completedAtInDays", () => {
    expect(isLiftedToday(baseTask({ completedAtIso: null, completedAtInDays: 0 }))).toBe(true);
    expect(isLiftedToday(baseTask({ completedAtIso: null, completedAtInDays: -1 }))).toBe(false);
  });
});

describe("formatLiftedTime", () => {
  it("formats ISO as local time", () => {
    const noon = new Date();
    noon.setHours(14, 34, 0, 0);
    const label = formatLiftedTime(baseTask({ completedAtIso: noon.toISOString() }));
    expect(label).toMatch(/2:34|14:34/);
  });

  it("shows earlier today without ISO", () => {
    expect(formatLiftedTime(baseTask({ completedAtIso: null, completedAtInDays: 0 }))).toBe(
      "earlier today"
    );
  });
});
