import { describe, expect, it } from "vitest";
import { extractJsonObject, normalizeCaptureParse } from "./capture-parse";
import {
  buildNeedsRespondCaptureTask,
  deferRespondByDateKey,
  deferRespondOneDay,
  nextFridayDateKey,
  respondByFromParse,
} from "./capture-task";

describe("capture-parse", () => {
  it("extracts JSON from fenced model output", () => {
    const raw =
      '```json\n{"personName":"Brandon","title":"Brandon — thanks","message":"thank you","respondInDays":5,"urgencyReason":"warm thanks, no ask"}\n```';
    expect(extractJsonObject(raw)).toEqual({
      personName: "Brandon",
      title: "Brandon — thanks",
      message: "thank you",
      respondInDays: 5,
      urgencyReason: "warm thanks, no ask",
    });
  });

  it("uses Gemini respondInDays for soft messages", () => {
    const ocr = `1:40€\nBrandon Bec\nthank you for being so open.`;
    const parsed = normalizeCaptureParse(
      {
        personName: "Brandon",
        title: "1:40€",
        message: "thank you for being so open.",
        respondInDays: 5,
        urgencyReason: "warm thanks, no clear ask",
      },
      ocr
    );
    expect(parsed).not.toBeNull();
    expect(parsed!.respondInDays).toBe(5);
    expect(parsed!.title).not.toMatch(/1:40/);
    expect(parsed!.urgencyReason).toContain("warm");
  });

  it("builds task with Gemini days and reason", () => {
    const t = buildNeedsRespondCaptureTask({
      text: "1:40€\nBrandon\nhey",
      id: "p1",
      now: new Date("2026-07-15T12:00:00"),
      parsed: {
        personName: "Brandon",
        title: "Brandon — practicing asking",
        message: "thank you for being so open…",
        respondInDays: 5,
        urgencyReason: "soft close, room to breathe",
      },
    });
    expect(t.title).toBe("Brandon — practicing asking");
    expect(t.personName).toBe("Brandon");
    expect(t.respondByDateKey).toBe("2026-07-20");
    expect(t.urgencyReason).toContain("soft");
  });

  it("maps respondInDays via respondByFromParse", () => {
    expect(
      respondByFromParse(
        { personName: null, title: "x", message: "x", respondInDays: 0, urgencyReason: null },
        "x",
        new Date("2026-07-15T12:00:00")
      )
    ).toBe("2026-07-15");
  });

  it("defers one day from today or further if already future", () => {
    const wed = new Date("2026-07-15T12:00:00");
    expect(deferRespondByDateKey("tomorrow", wed)).toBe("2026-07-16");
    expect(nextFridayDateKey(wed)).toBe("2026-07-17");
    expect(deferRespondOneDay({ respondByDateKey: "2026-07-14" }, wed)).toBe("2026-07-16");
    expect(deferRespondOneDay({ respondByDateKey: "2026-07-16" }, wed)).toBe("2026-07-17");
  });
});
