import type { WorkMode } from "./types";
import { WORK_MODES as SEED_WORK_MODES } from "./sample-data";

let active: WorkMode[] = SEED_WORK_MODES;

export function setActiveWorkModes(modes: WorkMode[]) {
  active = modes.length > 0 ? modes : SEED_WORK_MODES;
}

export function getActiveWorkModes(): WorkMode[] {
  return active;
}
