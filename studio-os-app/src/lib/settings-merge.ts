import type { LifeArea, WorkMode } from "./types";
import type { AppSettings } from "./settings-store";
import { LIFE_AREAS as SEED_LIFE_AREAS, WORK_MODES as SEED_WORK_MODES } from "./sample-data";

/**
 * Merging device settings with cloud settings.
 *
 * Settings ride as one jsonb blob with no per-field timestamps, so whoever
 * writes last wins. That is fine for scalars and fine for the keyed maps
 * (they union), but life areas are the labels the entire app hangs off — if
 * they silently revert, every lens lies. So they get one extra rule: a list
 * that is still the untouched sample seed is a placeholder, never a decision,
 * and can never overwrite a list the user has actually edited.
 */

/** True when `areas` is the untouched sample seed — nobody has edited life areas yet. */
export function isSeedLifeAreas(areas: LifeArea[] | null | undefined): boolean {
  if (!areas || areas.length !== SEED_LIFE_AREAS.length) return false;
  return SEED_LIFE_AREAS.every((seed, i) => {
    const a = areas[i];
    return !!a && a.id === seed.id && a.name === seed.name && a.color === seed.color;
  });
}

/**
 * Pick the surviving life areas. An edited list always beats a seed list
 * regardless of `preferLocal`. Ids only the loser knows about are kept on the
 * end, because tasks may still point at them — unless the loser is the seed,
 * whose areas carry no intent and must not come back once deleted.
 */
export function mergeLifeAreas(
  local: LifeArea[] | null | undefined,
  cloud: LifeArea[] | null | undefined,
  preferLocal: boolean
): LifeArea[] {
  const l = local ?? [];
  const c = cloud ?? [];
  if (l.length === 0) return c;
  if (c.length === 0) return l;

  const localIsSeed = isSeedLifeAreas(l);
  const cloudIsSeed = isSeedLifeAreas(c);
  const localWins = localIsSeed !== cloudIsSeed ? !localIsSeed : preferLocal;

  const winner = localWins ? l : c;
  const loser = localWins ? c : l;
  if (localWins ? cloudIsSeed : localIsSeed) return winner;

  const seen = new Set(winner.map((a) => a.id));
  return [...winner, ...loser.filter((a) => !seen.has(a.id))];
}

/**
 * Life areas for one merge. `forceCloud` is the one-shot repair handoff: it
 * skips the normal rules and takes the cloud list, for devices holding a list
 * an earlier sync corrupted — which looks edited to `isSeedLifeAreas` and
 * would otherwise win.
 */
export function pickLifeAreas(
  local: LifeArea[] | null | undefined,
  cloud: LifeArea[] | null | undefined,
  preferLocal: boolean,
  forceCloud = false
): LifeArea[] {
  if (forceCloud && cloud?.length) return cloud;
  return mergeLifeAreas(local, cloud, preferLocal);
}

/** True when `modes` is the untouched sample seed — nobody has edited work modes yet. */
export function isSeedWorkModes(modes: WorkMode[] | null | undefined): boolean {
  if (!modes || modes.length !== SEED_WORK_MODES.length) return false;
  return SEED_WORK_MODES.every((seed, i) => {
    const m = modes[i];
    return !!m && m.id === seed.id && m.name === seed.name;
  });
}

/** Same seed-vs-edited protection as `mergeLifeAreas`, applied to work modes. */
export function mergeWorkModes(
  local: WorkMode[] | null | undefined,
  cloud: WorkMode[] | null | undefined,
  preferLocal: boolean
): WorkMode[] {
  const l = local ?? [];
  const c = cloud ?? [];
  if (l.length === 0) return c;
  if (c.length === 0) return l;

  const localIsSeed = isSeedWorkModes(l);
  const cloudIsSeed = isSeedWorkModes(c);
  const localWins = localIsSeed !== cloudIsSeed ? !localIsSeed : preferLocal;

  const winner = localWins ? l : c;
  const loser = localWins ? c : l;
  if (localWins ? cloudIsSeed : localIsSeed) return winner;

  const seen = new Set(winner.map((m) => m.id));
  return [...winner, ...loser.filter((m) => !seen.has(m.id))];
}

/**
 * Merge a cloud settings blob into this device's settings.
 *
 * `preferLocal` is for the cutover pull, when this device's localStorage is
 * the copy the user is looking at. Pass false whenever local settings were
 * never read back from storage — a defaults-only device has nothing to
 * contribute and must not push its defaults up.
 *
 * `forceCloudLifeAreas` is passed through to `pickLifeAreas`.
 */
export function mergeSettings(
  local: AppSettings,
  cloud: Partial<AppSettings> | null,
  preferLocal: boolean,
  forceCloudLifeAreas = false
): AppSettings {
  if (!cloud) return local;
  const loser = preferLocal ? cloud : local;
  const winner: Partial<AppSettings> = preferLocal ? local : cloud;

  return {
    weekStartsOn: winner.weekStartsOn ?? loser.weekStartsOn ?? 0,
    weekPlanning: { ...(loser.weekPlanning ?? {}), ...(winner.weekPlanning ?? {}) },
    planningDeclinedAt: {
      ...(loser.planningDeclinedAt ?? {}),
      ...(winner.planningDeclinedAt ?? {}),
    },
    unplannedNudgeDismissedIds: {
      ...(loser.unplannedNudgeDismissedIds ?? {}),
      ...(winner.unplannedNudgeDismissedIds ?? {}),
    },
    contacts:
      (winner.contacts?.length ? winner.contacts : loser.contacts) ?? [],
    defaultSessionWarnBeforeMs:
      winner.defaultSessionWarnBeforeMs ?? loser.defaultSessionWarnBeforeMs ?? 5 * 60_000,
    ambientHyperfocusThresholdMs:
      winner.ambientHyperfocusThresholdMs ?? loser.ambientHyperfocusThresholdMs ?? 90 * 60_000,
    ambientHyperfocusRepeatMs:
      winner.ambientHyperfocusRepeatMs ?? loser.ambientHyperfocusRepeatMs ?? 10 * 60_000,
    lifeAreas: pickLifeAreas(
      local.lifeAreas,
      cloud.lifeAreas,
      preferLocal,
      forceCloudLifeAreas
    ),
    workModes: mergeWorkModes(local.workModes, cloud.workModes, preferLocal),
  };
}
