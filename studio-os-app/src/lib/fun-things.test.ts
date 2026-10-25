import { describe, expect, it } from "vitest";
import {
  activeFunThings,
  addFunThing,
  archiveFunThing,
  funThingDoneOnDate,
  toggleFunThingToday,
  type FunThingsState,
} from "./fun-things";

const EMPTY: FunThingsState = { things: [], days: {} };
const MONDAY = new Date("2026-07-13T12:00:00");
const TUESDAY = new Date("2026-07-14T12:00:00");

describe("addFunThing", () => {
  it("adds a trimmed, active item", () => {
    const next = addFunThing(EMPTY, "  Play guitar for fun  ");
    expect(next.things).toHaveLength(1);
    expect(next.things[0]).toMatchObject({ name: "Play guitar for fun", archivedAt: null });
    expect(next.things[0].id).toBeTruthy();
  });

  it("ignores blank names", () => {
    expect(addFunThing(EMPTY, "   ")).toBe(EMPTY);
  });
});

describe("archiveFunThing", () => {
  it("hides the item from the active list but keeps it stored", () => {
    const added = addFunThing(addFunThing(EMPTY, "Bake"), "Walk");
    const next = archiveFunThing(added, added.things[0].id);
    expect(next.things).toHaveLength(2);
    expect(activeFunThings(next).map((t) => t.name)).toEqual(["Walk"]);
  });
});

describe("toggleFunThingToday", () => {
  it("ticks and unticks for the given day only", () => {
    const added = addFunThing(EMPTY, "Bake");
    const id = added.things[0].id;
    const ticked = toggleFunThingToday(added, id, MONDAY);
    expect(funThingDoneOnDate(ticked, id, "2026-07-13")).toBe(true);
    expect(funThingDoneOnDate(ticked, id, "2026-07-14")).toBe(false);
    const unticked = toggleFunThingToday(ticked, id, MONDAY);
    expect(funThingDoneOnDate(unticked, id, "2026-07-13")).toBe(false);
  });

  it("resets the next day without losing yesterday's record", () => {
    const added = addFunThing(EMPTY, "Bake");
    const id = added.things[0].id;
    const mon = toggleFunThingToday(added, id, MONDAY);
    const tue = toggleFunThingToday(mon, id, TUESDAY);
    expect(funThingDoneOnDate(tue, id, "2026-07-13")).toBe(true);
    expect(funThingDoneOnDate(tue, id, "2026-07-14")).toBe(true);
  });
});
