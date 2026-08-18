import { describe, expect, it } from "vitest";
import {
  activeHabits,
  addHabit,
  archiveHabit,
  breakHabits,
  habitDoneOnDate,
  recentDateKeys,
  setHabitDone,
  toggleHabitToday,
  updateHabit,
  weeklyCount,
  type HabitsState,
} from "./habits";

const EMPTY: HabitsState = { habits: [], days: {} };
const MONDAY = new Date("2026-07-13T12:00:00"); // confirmed Monday

describe("addHabit", () => {
  it("creates a trimmed, active habit with defaults", () => {
    const next = addHabit(EMPTY, { name: "  Stretch  ", type: "break" });
    expect(next.habits).toHaveLength(1);
    expect(next.habits[0]).toMatchObject({
      name: "Stretch",
      type: "break",
      targetPerWeek: null,
      archivedAt: null,
    });
    expect(next.habits[0].id).toBeTruthy();
  });
});

describe("updateHabit / archiveHabit", () => {
  it("patches only the matching habit", () => {
    let state = addHabit(EMPTY, { name: "Stretch", type: "break" });
    state = addHabit(state, { name: "Practice guitar", type: "routine" });
    const id = state.habits[0].id;
    state = updateHabit(state, id, { name: "Stretch legs" });
    expect(state.habits[0].name).toBe("Stretch legs");
    expect(state.habits[1].name).toBe("Practice guitar");
  });

  it("archiving sets archivedAt without removing the habit", () => {
    let state = addHabit(EMPTY, { name: "Stretch", type: "break" });
    const id = state.habits[0].id;
    state = archiveHabit(state, id);
    expect(state.habits).toHaveLength(1);
    expect(state.habits[0].archivedAt).toBeTruthy();
    expect(activeHabits(state)).toHaveLength(0);
  });
});

describe("toggleHabitToday / setHabitDone / habitDoneOnDate", () => {
  it("toggles a habit on then off for today", () => {
    let state = addHabit(EMPTY, { name: "Stretch", type: "break" });
    const id = state.habits[0].id;
    state = toggleHabitToday(state, id, MONDAY);
    expect(habitDoneOnDate(state, id, "2026-07-13")).toBe(true);
    state = toggleHabitToday(state, id, MONDAY);
    expect(habitDoneOnDate(state, id, "2026-07-13")).toBe(false);
  });

  it("setHabitDone sets an explicit date without touching other days", () => {
    let state = addHabit(EMPTY, { name: "Stretch", type: "break" });
    const id = state.habits[0].id;
    state = setHabitDone(state, id, "2026-07-10", true);
    state = setHabitDone(state, id, "2026-07-11", true);
    expect(habitDoneOnDate(state, id, "2026-07-10")).toBe(true);
    expect(habitDoneOnDate(state, id, "2026-07-11")).toBe(true);
    expect(habitDoneOnDate(state, id, "2026-07-12")).toBe(false);
  });
});

describe("activeHabits / breakHabits", () => {
  it("filters by type and excludes archived", () => {
    let state = addHabit(EMPTY, { name: "Stretch", type: "break" });
    state = addHabit(state, { name: "Practice guitar", type: "routine" });
    state = addHabit(state, { name: "Walk", type: "break" });
    state = archiveHabit(state, state.habits[2].id);

    expect(activeHabits(state).map((h) => h.name)).toEqual(["Stretch", "Practice guitar"]);
    expect(breakHabits(state).map((h) => h.name)).toEqual(["Stretch"]);
    expect(activeHabits(state, "routine").map((h) => h.name)).toEqual(["Practice guitar"]);
  });
});

describe("weeklyCount", () => {
  it("counts done days within the given date range only", () => {
    let state = addHabit(EMPTY, { name: "Stretch", type: "break" });
    const id = state.habits[0].id;
    const week = ["2026-07-13", "2026-07-14", "2026-07-15", "2026-07-16", "2026-07-17", "2026-07-18", "2026-07-19"];
    state = setHabitDone(state, id, "2026-07-13", true);
    state = setHabitDone(state, id, "2026-07-15", true);
    state = setHabitDone(state, id, "2026-07-20", true); // outside the range
    expect(weeklyCount(state, id, week)).toBe(2);
  });
});

describe("recentDateKeys", () => {
  it("returns N local date keys ending today, oldest first", () => {
    expect(recentDateKeys(3, MONDAY)).toEqual(["2026-07-11", "2026-07-12", "2026-07-13"]);
  });
});
