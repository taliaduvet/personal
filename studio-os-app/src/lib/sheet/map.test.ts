import { describe, expect, it } from "vitest";
import {
  doingDayInTargetWeekOffset,
  headersMatch,
  mapProjectRow,
  mapSheetDoPlan,
  mapTaskRow,
  nextWeekdayOffset,
  parseSettingsRows,
  buildProjectNameLookup,
} from "./map";
import { PROJECTS_HEADERS, TASKS_HEADERS } from "./schema";

const WEEK_START: 1 = 1; // Monday

function mondayOfWeekContaining(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const daysSinceMon = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - daysSinceMon);
  return d;
}

describe("headersMatch", () => {
  it("accepts matching task headers", () => {
    expect(headersMatch([...TASKS_HEADERS], TASKS_HEADERS)).toBe(true);
  });

  it("rejects short header rows", () => {
    expect(headersMatch(["Task"], TASKS_HEADERS)).toBe(false);
  });
});

describe("mapProjectRow", () => {
  it("maps a project row with stable ID", () => {
    const row = ["Spring EP", "Debut EP", "Active", "", "#3C8262", "Release EP", "proj-uuid"];
    const p = mapProjectRow(row);
    expect(p).toEqual({
      id: "proj-uuid",
      name: "Spring EP",
      lifeAreaId: "music",
      why: "Debut EP",
    });
  });
});

describe("mapTaskRow", () => {
  const projects = [
    { id: "proj-1", name: "Spring EP", lifeAreaId: "music", why: null },
  ];
  const byName = buildProjectNameLookup(projects);
  const byId = new Map(projects.map((p) => [p.id, p]));

  it("maps status and category", () => {
    const mon = mondayOfWeekContaining(new Date());
    const row = new Array(15).fill("");
    row[0] = "Master track";
    row[1] = "Release";
    row[2] = "Spring EP";
    row[4] = mon.getTime() / 86_400_000 + 25569 + 5; // serial ~5 days out
    row[6] = "Wed";
    row[7] = "In progress";
    row[8] = "v3 mix";
    row[12] = "task-uuid";
    row[13] = mon.getTime() / 86_400_000 + 25569 - 7;

    const task = mapTaskRow(row, byName, byId, WEEK_START);
    expect(task?.id).toBe("task-uuid");
    expect(task?.title).toBe("Master track");
    expect(task?.status).toBe("in_progress");
    expect(task?.workModeId).toBe("creative");
    expect(task?.projectId).toBe("proj-1");
    expect(task?.lifeAreaId).toBe("music");
    expect(task?.notes).toBe("v3 mix");
    expect(task?.inToday).toBe(false);
    expect(task?.subtasks).toEqual([]);
  });

  it("maps Done status with completed date", () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const row = new Array(15).fill("");
    row[0] = "Shipped cover";
    row[1] = "Release";
    row[7] = "Done";
    row[12] = "done-task";
    row[14] = today.getTime() / 86_400_000 + 25569;

    const task = mapTaskRow(row, byName, byId, WEEK_START);
    expect(task?.status).toBe("done");
    expect(task?.completedAtInDays).toBe(0);
  });
});

describe("mapSheetDoPlan", () => {
  it("uses doing day alone for next occurrence", () => {
    const from = new Date("2026-06-18T12:00:00"); // Thursday
    expect(nextWeekdayOffset("Fri", from)).toBe(1);
    expect(nextWeekdayOffset("Mon", from)).toBe(4);
  });

  it("combines target week + doing day", () => {
    const mon = new Date("2026-06-15T12:00:00");
    const offset = doingDayInTargetWeekOffset("Wed", mon);
    expect(offset).toBe(offsetFromTodayHelper(new Date("2026-06-17T12:00:00")));
  });

  it("returns week bucket when only target week is set", () => {
    const mon = new Date("2026-06-15T12:00:00");
    const plan = mapSheetDoPlan("", mon, WEEK_START);
    expect(plan).toEqual({ kind: "week", weekStart: "2026-06-15" });
  });
});

describe("parseSettingsRows", () => {
  it("reads key/value pairs", () => {
    const settings = parseSettingsRows([
      ["Key", "Value"],
      ["schemaVersion", "1.0.0"],
      ["userName", "Talia"],
    ]);
    expect(settings.schemaVersion).toBe("1.0.0");
    expect(settings.userName).toBe("Talia");
  });
});

function offsetFromTodayHelper(date: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86_400_000);
}

describe("mapProjectRow", () => {
  it("returns null without project id", () => {
    expect(mapProjectRow(["Name only", "", "", "", "", "", ""])).toBeNull();
  });
});

describe("headersMatch projects", () => {
  it("accepts project headers", () => {
    expect(headersMatch([...PROJECTS_HEADERS], PROJECTS_HEADERS)).toBe(true);
  });
});
