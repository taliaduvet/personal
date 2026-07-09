import { describe, expect, it } from "vitest";
import { formatRelativeDayOffset } from "./time-display";

describe("formatRelativeDayOffset", () => {
  it("formats today and tomorrow", () => {
    expect(formatRelativeDayOffset(0)).toMatch(/ · today$/);
    expect(formatRelativeDayOffset(1)).toMatch(/ · tomorrow$/);
  });

  it("formats future offset", () => {
    expect(formatRelativeDayOffset(7)).toMatch(/ · in 7 days$/);
  });

  it("formats overdue", () => {
    expect(formatRelativeDayOffset(-2)).toMatch(/ · 2 days over$/);
  });
});
