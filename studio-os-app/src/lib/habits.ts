import { localDateKey } from "./local-date";

/**
 * Habits — a general, user-editable habit tracker.
 * Deliberately separate from the Practice tracker (`body-program.ts`), which
 * stays a hardcoded personal program. Habits has no seed content — the user
 * creates every entry — but ships a few tap-to-prefill name suggestions so
 * the "break" empty state isn't a blank textbox.
 */

export type HabitType = "break" | "routine";

export interface Habit {
  id: string;
  name: string;
  note?: string;
  type: HabitType;
  targetPerWeek?: number | null;
  createdAt: string;
  archivedAt?: string | null;
}

export interface HabitsState {
  habits: Habit[];
  /** dateKey -> habitId -> done */
  days: Record<string, Record<string, boolean>>;
}

export const EMPTY_HABITS_STATE: HabitsState = { habits: [], days: {} };

export const BREAK_SUGGESTIONS: string[] = [
  "Stretch",
  "Drink water",
  "Walk outside",
  "Look away from the screen",
  "Deep breath",
];

// ── Storage ──────────────────────────────────────────────────────────────

const STORAGE_KEY = "studio-os.habits.v1";

export function loadHabitsState(): HabitsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { habits: [], days: {} };
    const parsed = JSON.parse(raw) as Partial<HabitsState>;
    return {
      habits: Array.isArray(parsed.habits) ? parsed.habits : [],
      days: parsed.days && typeof parsed.days === "object" ? parsed.days : {},
    };
  } catch {
    return { habits: [], days: {} };
  }
}

export function saveHabitsState(state: HabitsState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

// ── CRUD helpers (pure — callers thread these through setState) ────────────

export function addHabit(
  state: HabitsState,
  input: { name: string; type: HabitType; note?: string; targetPerWeek?: number | null }
): HabitsState {
  const habit: Habit = {
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `h-${Date.now()}`,
    name: input.name.trim(),
    note: input.note?.trim() || undefined,
    type: input.type,
    targetPerWeek: input.targetPerWeek ?? null,
    createdAt: new Date().toISOString(),
    archivedAt: null,
  };
  return { ...state, habits: [...state.habits, habit] };
}

export function updateHabit(state: HabitsState, id: string, patch: Partial<Habit>): HabitsState {
  return {
    ...state,
    habits: state.habits.map((h) => (h.id === id ? { ...h, ...patch } : h)),
  };
}

export function archiveHabit(state: HabitsState, id: string): HabitsState {
  return updateHabit(state, id, { archivedAt: new Date().toISOString() });
}

export function toggleHabitToday(state: HabitsState, habitId: string, now = new Date()): HabitsState {
  const key = localDateKey(now);
  const day = { ...(state.days[key] ?? {}) };
  if (day[habitId]) delete day[habitId];
  else day[habitId] = true;
  return { ...state, days: { ...state.days, [key]: day } };
}

export function setHabitDone(state: HabitsState, habitId: string, dateKey: string, done: boolean): HabitsState {
  const day = { ...(state.days[dateKey] ?? {}) };
  if (done) day[habitId] = true;
  else delete day[habitId];
  return { ...state, days: { ...state.days, [dateKey]: day } };
}

// ── Derived helpers ──────────────────────────────────────────────────────

export function activeHabits(state: HabitsState, type?: HabitType): Habit[] {
  return state.habits.filter((h) => !h.archivedAt && (type ? h.type === type : true));
}

export function habitDoneOnDate(state: HabitsState, habitId: string, dateKey: string): boolean {
  return Boolean(state.days[dateKey]?.[habitId]);
}

export function weeklyCount(state: HabitsState, habitId: string, dates: string[]): number {
  return dates.filter((d) => habitDoneOnDate(state, habitId, d)).length;
}

/** Active "break" habits — the pool the session-nudge banner suggests from. */
export function breakHabits(state: HabitsState): Habit[] {
  return activeHabits(state, "break");
}

/** Last `days` local date keys, most recent last (today included). */
export function recentDateKeys(days: number, now = new Date()): string[] {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (days - 1 - i));
    return localDateKey(d);
  });
}
