import { localDateKey } from "./local-date";

/**
 * Fun things — a short, always-visible list of things the user enjoys and does
 * just for themself. Deliberately NOT tasks: they never enter the Lot, the
 * bench, week planning, or the completeness invariant. A "did it today" tick
 * resets each day. Device-only, like Habits — never synced or exported.
 */

export interface FunThing {
  id: string;
  name: string;
  createdAt: string;
  archivedAt?: string | null;
}

export interface FunThingsState {
  things: FunThing[];
  /** dateKey -> funThingId -> done */
  days: Record<string, Record<string, boolean>>;
}

export const EMPTY_FUN_THINGS_STATE: FunThingsState = { things: [], days: {} };

// ── Storage ──────────────────────────────────────────────────────────────

const STORAGE_KEY = "studio-os.fun-things.v1";

export function loadFunThingsState(): FunThingsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { things: [], days: {} };
    const parsed = JSON.parse(raw) as Partial<FunThingsState>;
    return {
      things: Array.isArray(parsed.things) ? parsed.things : [],
      days: parsed.days && typeof parsed.days === "object" ? parsed.days : {},
    };
  } catch {
    return { things: [], days: {} };
  }
}

export function saveFunThingsState(state: FunThingsState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

// ── CRUD helpers (pure — callers thread these through setState) ────────────

export function addFunThing(state: FunThingsState, name: string): FunThingsState {
  const trimmed = name.trim();
  if (!trimmed) return state;
  const thing: FunThing = {
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `f-${Date.now()}`,
    name: trimmed,
    createdAt: new Date().toISOString(),
    archivedAt: null,
  };
  return { ...state, things: [...state.things, thing] };
}

export function archiveFunThing(state: FunThingsState, id: string): FunThingsState {
  return {
    ...state,
    things: state.things.map((t) =>
      t.id === id ? { ...t, archivedAt: new Date().toISOString() } : t
    ),
  };
}

export function toggleFunThingToday(
  state: FunThingsState,
  id: string,
  now = new Date()
): FunThingsState {
  const key = localDateKey(now);
  const day = { ...(state.days[key] ?? {}) };
  if (day[id]) delete day[id];
  else day[id] = true;
  return { ...state, days: { ...state.days, [key]: day } };
}

// ── Derived helpers ──────────────────────────────────────────────────────

export function activeFunThings(state: FunThingsState): FunThing[] {
  return state.things.filter((t) => !t.archivedAt);
}

export function funThingDoneOnDate(state: FunThingsState, id: string, dateKey: string): boolean {
  return Boolean(state.days[dateKey]?.[id]);
}
