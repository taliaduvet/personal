import { describe, expect, it } from "vitest";
import {
  dayPlan,
  doPlanDayOffset,
  normalizeDoPlan,
  normalizeDeadlineDateKey,
  deadlineOffsetFromDateKey,
} from "./do-plan";
import { addDaysToDateKey, localDateKey } from "./local-date";

describe("absolute day plans", () => {
  it("stores a calendar date, not a sticky offset", () => {
    const monday = new Date("2026-07-13T15:00:00");
    const plan = dayPlan(1, monday); // Tuesday
    expect(plan).toEqual({ kind: "day", dateKey: "2026-07-14" });
  });

  it("yesterday's tomorrow becomes today's today", () => {
    const yesterday = new Date("2026-07-13T12:00:00");
    const plan = dayPlan(1, yesterday); // was "tomorrow" = Jul 14
    if (plan?.kind !== "day") throw new Error("expected day plan");
    const today = new Date("2026-07-14T09:00:00");
    expect(doPlanDayOffset(plan, today)).toBe(0);
    // Label uses live clock — stub via offset path is covered above.
    expect(plan.dateKey).toBe("2026-07-14");
  });

  it("migrates legacy sticky offsets from parkedAt", () => {
    const parkedAt = new Date("2026-07-13T18:00:00").getTime();
    const migrated = normalizeDoPlan({ kind: "day", offset: 1 } as never, null, parkedAt);
    expect(migrated).toEqual({ kind: "day", dateKey: "2026-07-14" });
  });

  it("keeps absolute deadline keys rolling with the day", () => {
    const key = normalizeDeadlineDateKey(undefined, 1, new Date("2026-07-13T12:00:00").getTime());
    expect(key).toBe("2026-07-14");
    expect(deadlineOffsetFromDateKey(key, new Date("2026-07-14T08:00:00"))).toBe(0);
    expect(deadlineOffsetFromDateKey(key, new Date("2026-07-13T08:00:00"))).toBe(1);
  });

  it("addDaysToDateKey stays on local calendar", () => {
    expect(addDaysToDateKey("2026-07-13", 1)).toBe("2026-07-14");
    expect(localDateKey(new Date(2026, 6, 13))).toBe("2026-07-13");
  });
});
