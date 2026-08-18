import { describe, expect, it } from "vitest";
import { isSeedLifeAreas, mergeLifeAreas, mergeSettings } from "./settings-merge";
import { LIFE_AREAS as SEED } from "./sample-data";
import type { AppSettings } from "./settings-store";
import type { LifeArea } from "./types";

const CUSTOM: LifeArea[] = [
  { id: "music", name: "Talia Duvet", color: "#56b6e6" },
  { id: "health", name: "Cycles", color: "#a17bdb" },
  { id: "area-tall-order", name: "Tall Order", color: "#f86301" },
];

function settings(over: Partial<AppSettings> = {}): AppSettings {
  return {
    weekStartsOn: 0,
    weekPlanning: {},
    planningDeclinedAt: {},
    unplannedNudgeDismissedIds: {},
    contacts: [],
    lifeAreas: SEED,
    defaultSessionWarnBeforeMs: 5 * 60_000,
    ambientHyperfocusThresholdMs: 90 * 60_000,
    ambientHyperfocusRepeatMs: 10 * 60_000,
    ...over,
  };
}

describe("isSeedLifeAreas", () => {
  it("recognises the untouched seed", () => {
    expect(isSeedLifeAreas(SEED)).toBe(true);
  });

  it("rejects a renamed seed area", () => {
    const renamed = SEED.map((a) => (a.id === "music" ? { ...a, name: "Talia Duvet" } : a));
    expect(isSeedLifeAreas(renamed)).toBe(false);
  });

  it("rejects the seed plus a custom area", () => {
    expect(isSeedLifeAreas([...SEED, CUSTOM[2]])).toBe(false);
  });
});

describe("mergeLifeAreas", () => {
  it("never lets a seed list overwrite edited areas, even when local wins", () => {
    expect(mergeLifeAreas(SEED, CUSTOM, true)).toEqual(CUSTOM);
  });

  it("keeps edited local areas against a seed cloud blob", () => {
    expect(mergeLifeAreas(CUSTOM, SEED, false)).toEqual(CUSTOM);
  });

  it("keeps ids only the losing side knows about", () => {
    const cloud: LifeArea[] = [{ id: "music", name: "Music renamed", color: "#000" }];
    const merged = mergeLifeAreas(CUSTOM, cloud, false);
    expect(merged[0]).toEqual(cloud[0]);
    expect(merged.map((a) => a.id)).toContain("area-tall-order");
  });

  it("falls back to the other side when one is empty", () => {
    expect(mergeLifeAreas([], CUSTOM, true)).toEqual(CUSTOM);
    expect(mergeLifeAreas(CUSTOM, [], false)).toEqual(CUSTOM);
  });
});

describe("mergeSettings", () => {
  it("does not push a cold device's defaults over real cloud areas", () => {
    const merged = mergeSettings(settings(), { lifeAreas: CUSTOM, weekStartsOn: 1 }, false);
    expect(merged.lifeAreas).toEqual(CUSTOM);
    expect(merged.weekStartsOn).toBe(1);
  });

  it("keeps this device's edits on the cutover pull", () => {
    const local = settings({ lifeAreas: CUSTOM, weekStartsOn: 1 });
    const merged = mergeSettings(local, { lifeAreas: SEED, weekStartsOn: 0 }, true);
    expect(merged.lifeAreas).toEqual(CUSTOM);
    expect(merged.weekStartsOn).toBe(1);
  });

  it("unions the keyed maps so neither side drops a week", () => {
    const local = settings({ planningDeclinedAt: { "2026-07-20": "2026-07-20" } });
    const merged = mergeSettings(
      local,
      { planningDeclinedAt: { "2026-07-13": "2026-07-13" } },
      true
    );
    expect(Object.keys(merged.planningDeclinedAt).sort()).toEqual(["2026-07-13", "2026-07-20"]);
  });

  it("returns local untouched when there is no cloud blob", () => {
    const local = settings({ lifeAreas: CUSTOM });
    expect(mergeSettings(local, null, false)).toBe(local);
  });

  describe("one-shot repair handoff", () => {
    // A device corrupted by the old sync holds seed-looking-but-not-seed areas,
    // so the seed check can't catch it and it would win the cutover merge.
    const CORRUPTED: LifeArea[] = [...SEED.slice(0, 3), CUSTOM[2]];

    it("takes the cloud list even on a cutover pull that prefers local", () => {
      const local = settings({ lifeAreas: CORRUPTED });
      const merged = mergeSettings(local, { lifeAreas: CUSTOM }, true, true);
      expect(merged.lifeAreas).toEqual(CUSTOM);
    });

    it("would otherwise let the corrupted local list win", () => {
      const local = settings({ lifeAreas: CORRUPTED });
      const merged = mergeSettings(local, { lifeAreas: CUSTOM }, true, false);
      expect(merged.lifeAreas[0]).toEqual(CORRUPTED[0]);
    });

    it("keeps local areas when the cloud has none to hand over", () => {
      const local = settings({ lifeAreas: CORRUPTED });
      expect(mergeSettings(local, { lifeAreas: [] }, true, true).lifeAreas).toEqual(CORRUPTED);
    });

    it("still respects other settings rules", () => {
      const local = settings({ lifeAreas: CORRUPTED, weekStartsOn: 1 });
      const merged = mergeSettings(local, { lifeAreas: CUSTOM, weekStartsOn: 0 }, true, true);
      expect(merged.weekStartsOn).toBe(1);
    });
  });
});
