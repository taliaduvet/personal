import { describe, expect, it } from "vitest";
import { parseTaskTitle } from "./parse";

describe("parseTaskTitle", () => {
  it("detects mode, doing date, and strips hints from title", () => {
    const result = parseTaskTitle("email venues tomorrow creative");
    expect(result.title).toBe("email venues");
    expect(result.workModeId).toBe("creative");
    expect(result.doPlan).toEqual({ kind: "day", offset: 1 });
  });

  it("detects project names from the live registry", () => {
    const result = parseTaskTitle("mix vocals for spring ep");
    expect(result.projectId).toBe("spring-ep");
    expect(result.lifeAreaId).toBe("music");
    expect(result.title.toLowerCase()).not.toContain("spring ep");
  });

  it("detects explicit mode prefix and deadlines", () => {
    const result = parseTaskTitle("admin: submit timesheet due friday");
    expect(result.workModeId).toBe("admin");
    expect(result.title).toBe("submit timesheet");
    expect(result.deadlineInDays).not.toBeNull();
  });

  it("detects explicit mode words", () => {
    const result = parseTaskTitle("book dentist errands");
    expect(result.workModeId).toBe("errands");
  });
});
