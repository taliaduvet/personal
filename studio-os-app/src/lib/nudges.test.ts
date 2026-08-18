import { describe, it, expect } from "vitest";
import {
  resolveDeadlineDateKey,
  computeLeadTimeDays,
  manualStartThinkingPatch,
  isAcknowledged,
} from "./nudges";
import type { Task } from "./types";

const base: Task = {
  id: "t1",
  title: "Book studio",
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
};

describe("resolveDeadlineDateKey", () => {
  it("prefers an explicit deadlineDateKey", () => {
    const t = { ...base, deadlineDateKey: "2026-08-01", deadlineInDays: 3 };
    expect(resolveDeadlineDateKey(t, new Date(2026, 6, 25))).toBe("2026-08-01");
  });

  it("derives from deadlineInDays offset when no key", () => {
    const t = { ...base, deadlineInDays: 7 };
    expect(resolveDeadlineDateKey(t, new Date(2026, 6, 25))).toBe("2026-08-01");
  });

  it("returns null when no deadline at all", () => {
    expect(resolveDeadlineDateKey(base, new Date(2026, 6, 25))).toBeNull();
  });
});

describe("computeLeadTimeDays", () => {
  it("counts whole days between start and deadline", () => {
    expect(computeLeadTimeDays("2026-07-25", "2026-08-01")).toBe(7);
  });

  it("clamps a start after the deadline to 0", () => {
    expect(computeLeadTimeDays("2026-08-05", "2026-08-01")).toBe(0);
  });

  it("is null when a side is missing", () => {
    expect(computeLeadTimeDays(null, "2026-08-01")).toBeNull();
    expect(computeLeadTimeDays("2026-07-25", undefined)).toBeNull();
  });
});

describe("manualStartThinkingPatch", () => {
  it("marks source manual and recomputes lead time from the override", () => {
    const t = { ...base, deadlineInDays: 7 };
    const patch = manualStartThinkingPatch(t, "2026-07-28", new Date(2026, 6, 25));
    expect(patch.leadTimeSource).toBe("manual");
    expect(patch.startThinkingAtDateKey).toBe("2026-07-28");
    // deadline resolves to 2026-08-01; 2026-07-28 -> 4 days lead.
    expect(patch.leadTimeDays).toBe(4);
  });

  it("leaves lead time null when there's no deadline to measure against", () => {
    const patch = manualStartThinkingPatch(base, "2026-07-28", new Date(2026, 6, 25));
    expect(patch.leadTimeDays).toBeNull();
    expect(patch.leadTimeSource).toBe("manual");
  });
});

describe("isAcknowledged", () => {
  it("is true only once acknowledgedAt is set", () => {
    expect(isAcknowledged(base)).toBe(false);
    expect(isAcknowledged({ ...base, acknowledgedAt: "2026-07-25T10:00:00Z" })).toBe(true);
  });
});
