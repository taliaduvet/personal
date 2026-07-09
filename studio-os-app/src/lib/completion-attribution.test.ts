import { describe, expect, it } from "vitest";
import { resolveCompletionAttribution } from "./completion-attribution";

describe("resolveCompletionAttribution", () => {
  it("prefers active session on same task", () => {
    expect(
      resolveCompletionAttribution(
        "t1",
        { inToday: true },
        { activeSessionTaskId: "t1", activeSessionStartLogId: "al-1", shapeBlock: "morning" }
      ).attribution
    ).toBe("session");
  });

  it("uses shape block when no session", () => {
    expect(
      resolveCompletionAttribution(
        "t1",
        { inToday: true },
        { activeSessionTaskId: null, activeSessionStartLogId: null, shapeBlock: "afternoon" }
      )
    ).toEqual({ attribution: "shape_block", shapeBlock: "afternoon" });
  });

  it("falls back to today_bench then unplaced", () => {
    expect(
      resolveCompletionAttribution(
        "t1",
        { inToday: true },
        { activeSessionTaskId: null, activeSessionStartLogId: null, shapeBlock: null }
      ).attribution
    ).toBe("today_bench");
    expect(
      resolveCompletionAttribution(
        "t1",
        { inToday: false },
        { activeSessionTaskId: null, activeSessionStartLogId: null, shapeBlock: null }
      ).attribution
    ).toBe("unplaced");
  });
});
