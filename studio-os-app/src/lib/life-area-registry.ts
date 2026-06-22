import type { LifeArea } from "./types";
import { LIFE_AREAS as SEED_LIFE_AREAS } from "./sample-data";

let active: LifeArea[] = SEED_LIFE_AREAS;

export function setActiveLifeAreas(areas: LifeArea[]) {
  active = areas.length > 0 ? areas : SEED_LIFE_AREAS;
}

export function getActiveLifeAreas(): LifeArea[] {
  return active;
}

export function activeLifeAreaById(): Record<string, LifeArea> {
  return Object.fromEntries(active.map((a) => [a.id, a]));
}
