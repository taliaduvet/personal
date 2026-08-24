import { describe, expect, it } from "vitest";
import {
  ambientNudgeDue,
  clampWarnBeforeMs,
  msUntilNextAmbientEvent,
  msUntilNextTimedEvent,
  nudgeMessage,
  timedNudgeDue,
} from "./session-nudge";
import type { ActiveSession } from "./sessions";

const START = new Date("2026-07-13T12:00:00").getTime(); // arbitrary fixed anchor

function baseSession(overrides: Partial<ActiveSession> = {}): ActiveSession {
  return {
    taskId: "t1",
    projectId: null,
    startedAtIso: new Date(START).toISOString(),
    startLogId: "log1",
    ...overrides,
  };
}

describe("clampWarnBeforeMs", () => {
  it("clamps to the target when the lead time would exceed it", () => {
    expect(clampWarnBeforeMs(5 * 60_000, 10 * 60_000)).toBe(5 * 60_000);
  });
  it("clamps negative input to 0", () => {
    expect(clampWarnBeforeMs(5 * 60_000, -1)).toBe(0);
  });
  it("passes through a normal value unchanged", () => {
    expect(clampWarnBeforeMs(30 * 60_000, 5 * 60_000)).toBe(5 * 60_000);
  });
});

describe("timedNudgeDue / msUntilNextTimedEvent", () => {
  const target = 30 * 60_000;
  const warnBefore = 5 * 60_000;

  it("is null before the warning threshold", () => {
    const s = baseSession({ targetDurationMs: target, warnBeforeMs: warnBefore });
    expect(timedNudgeDue(s, START + 10 * 60_000)).toBeNull();
    expect(msUntilNextTimedEvent(s, START + 10 * 60_000)).toBe(15 * 60_000);
  });

  it("fires 'warning' exactly at the threshold, once unfired", () => {
    const s = baseSession({ targetDurationMs: target, warnBeforeMs: warnBefore });
    expect(timedNudgeDue(s, START + 25 * 60_000)).toBe("warning");
    expect(msUntilNextTimedEvent(s, START + 25 * 60_000)).toBe(0);
  });

  it("does not re-fire warning once its latch is set, and counts down to times-up instead", () => {
    const s = baseSession({
      targetDurationMs: target,
      warnBeforeMs: warnBefore,
      warningFiredAtIso: new Date(START + 25 * 60_000).toISOString(),
    });
    expect(timedNudgeDue(s, START + 26 * 60_000)).toBeNull();
    expect(msUntilNextTimedEvent(s, START + 26 * 60_000)).toBe(4 * 60_000);
  });

  it("fires 'times-up' once the target elapses", () => {
    const s = baseSession({
      targetDurationMs: target,
      warnBeforeMs: warnBefore,
      warningFiredAtIso: new Date(START + 25 * 60_000).toISOString(),
    });
    expect(timedNudgeDue(s, START + 30 * 60_000)).toBe("times-up");
  });

  it("is fully quiet (one-shot) once both latches are set", () => {
    const s = baseSession({
      targetDurationMs: target,
      warnBeforeMs: warnBefore,
      warningFiredAtIso: new Date(START + 25 * 60_000).toISOString(),
      timesUpFiredAtIso: new Date(START + 30 * 60_000).toISOString(),
    });
    expect(timedNudgeDue(s, START + 60 * 60_000)).toBeNull();
    expect(msUntilNextTimedEvent(s, START + 60 * 60_000)).toBeNull();
  });

  it("reopening long after target elapsed fires warning first, not both at once", () => {
    const s = baseSession({ targetDurationMs: target, warnBeforeMs: warnBefore });
    // Simulates the tab being closed for hours past the target.
    expect(timedNudgeDue(s, START + 5 * 60 * 60_000)).toBe("warning");
  });

  it("has no timed event when no target is set", () => {
    const s = baseSession();
    expect(timedNudgeDue(s, START + 60 * 60_000)).toBeNull();
    expect(msUntilNextTimedEvent(s, START + 60 * 60_000)).toBeNull();
  });
});

describe("ambientNudgeDue / msUntilNextAmbientEvent", () => {
  const threshold = 90 * 60_000;
  const repeat = 10 * 60_000;

  it("does not apply when a target duration is set (timed path owns that session)", () => {
    const s = baseSession({ targetDurationMs: 30 * 60_000, ambientThresholdMs: threshold, ambientRepeatMs: repeat });
    expect(ambientNudgeDue(s, START + 200 * 60_000)).toBe(false);
    expect(msUntilNextAmbientEvent(s, START + 200 * 60_000)).toBeNull();
  });

  it("is false before the threshold, true at/after it", () => {
    const s = baseSession({ ambientThresholdMs: threshold, ambientRepeatMs: repeat });
    expect(ambientNudgeDue(s, START + 89 * 60_000)).toBe(false);
    expect(ambientNudgeDue(s, START + 90 * 60_000)).toBe(true);
    expect(msUntilNextAmbientEvent(s, START + 80 * 60_000)).toBe(10 * 60_000);
  });

  it("re-fires every repeat interval after the first fire", () => {
    const s = baseSession({
      ambientThresholdMs: threshold,
      ambientRepeatMs: repeat,
      ambientLastFiredAtIso: new Date(START + 90 * 60_000).toISOString(),
    });
    expect(ambientNudgeDue(s, START + 95 * 60_000)).toBe(false);
    expect(ambientNudgeDue(s, START + 100 * 60_000)).toBe(true);
    expect(msUntilNextAmbientEvent(s, START + 95 * 60_000)).toBe(5 * 60_000);
  });

  it("stops permanently once acknowledged, even past another repeat window", () => {
    const s = baseSession({
      ambientThresholdMs: threshold,
      ambientRepeatMs: repeat,
      ambientLastFiredAtIso: new Date(START + 90 * 60_000).toISOString(),
      ambientAcknowledgedAtIso: new Date(START + 91 * 60_000).toISOString(),
    });
    expect(ambientNudgeDue(s, START + 500 * 60_000)).toBe(false);
    expect(msUntilNextAmbientEvent(s, START + 500 * 60_000)).toBeNull();
  });
});

describe("nudgeMessage", () => {
  it("names the task for each kind", () => {
    expect(nudgeMessage("warning", "Master the mix")).toContain("Master the mix");
    expect(nudgeMessage("times-up", "Master the mix")).toContain("Master the mix");
    expect(nudgeMessage("ambient-checkin", "Master the mix")).toContain("Master the mix");
  });

  it("falls back to 'this' for a blank title", () => {
    expect(nudgeMessage("warning", "  ")).toContain("this");
  });
});
