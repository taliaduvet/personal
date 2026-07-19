import { describe, expect, it } from "vitest";
import {
  buildNeedsRespondCaptureTask,
  inferRespondByDateKey,
  titleFromCaptureText,
} from "./capture-task";

describe("capture-task", () => {
  it("titles from first line and truncates", () => {
    expect(titleFromCaptureText("Hello there\nmore")).toBe("Hello there");
    const long = "x".repeat(200);
    expect(titleFromCaptureText(long).length).toBeLessThanOrEqual(120);
  });

  it("infers today for asap/today", () => {
    const from = new Date("2026-07-15T15:00:00");
    expect(inferRespondByDateKey("need this ASAP please", from)).toBe("2026-07-15");
    expect(inferRespondByDateKey("can you look today?", from)).toBe("2026-07-15");
  });

  it("defaults respond-by to tomorrow", () => {
    const from = new Date("2026-07-15T15:00:00");
    expect(inferRespondByDateKey("hey when you can", from)).toBe("2026-07-16");
  });

  it("builds a full needsRespond task off Today", () => {
    const t = buildNeedsRespondCaptureTask({
      text: "From James: staging link ready",
      id: "fixed-id",
      now: new Date("2026-07-15T12:00:00"),
    });
    expect(t.id).toBe("fixed-id");
    expect(t.needsRespond).toBe(true);
    expect(t.inToday).toBe(false);
    expect(t.source).toBe("iphone_share");
    expect(t.notes).toContain("James");
    expect(t.lifeAreaId).toBe("people");
    expect(t.respondByDateKey).toBe("2026-07-16");
    expect(t.status).toBe("todo");
    expect(t.doPlan).toBeNull();
  });
});
