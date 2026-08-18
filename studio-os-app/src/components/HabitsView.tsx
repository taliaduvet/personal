"use client";

import { useEffect, useState } from "react";
import { localDateKey } from "@/lib/local-date";
import {
  BREAK_SUGGESTIONS,
  EMPTY_HABITS_STATE,
  activeHabits,
  addHabit,
  archiveHabit,
  habitDoneOnDate,
  loadHabitsState,
  recentDateKeys,
  saveHabitsState,
  setHabitDone,
  toggleHabitToday,
  updateHabit,
  weeklyCount,
  type Habit,
  type HabitType,
  type HabitsState,
} from "@/lib/habits";

interface DraftHabit {
  id: string | null; // null = creating new
  name: string;
  note: string;
  type: HabitType;
  targetPerWeek: string; // kept as string for the input, parsed on save
}

const EMPTY_DRAFT: DraftHabit = { id: null, name: "", note: "", type: "break", targetPerWeek: "" };

export function HabitsView() {
  const [state, setState] = useState<HabitsState>(EMPTY_HABITS_STATE);
  const [hydrated, setHydrated] = useState(false);
  const [draft, setDraft] = useState<DraftHabit | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    setState(loadHabitsState());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveHabitsState(state);
  }, [state, hydrated]);

  if (!hydrated) return null;

  const today = localDateKey(new Date());
  const week = recentDateKeys(7);
  const breakList = activeHabits(state, "break");
  const routineList = activeHabits(state, "routine");
  const archived = state.habits.filter((h) => h.archivedAt);

  function startAdd(type: HabitType) {
    setDraft({ ...EMPTY_DRAFT, type });
  }
  function startEdit(habit: Habit) {
    setDraft({
      id: habit.id,
      name: habit.name,
      note: habit.note ?? "",
      type: habit.type,
      targetPerWeek: habit.targetPerWeek != null ? String(habit.targetPerWeek) : "",
    });
  }
  function saveDraft() {
    if (!draft || !draft.name.trim()) return;
    const targetPerWeek = draft.targetPerWeek.trim() ? Math.max(0, parseInt(draft.targetPerWeek, 10)) : null;
    setState((prev) =>
      draft.id
        ? updateHabit(prev, draft.id, { name: draft.name, note: draft.note || undefined, type: draft.type, targetPerWeek })
        : addHabit(prev, { name: draft.name, note: draft.note || undefined, type: draft.type, targetPerWeek })
    );
    setDraft(null);
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <header className="pb-3.5 pt-1">
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink">Habits</h1>
        <p className="mt-1 text-sm text-muted">
          Anything you want to keep showing up for — break resets get suggested mid-session.
        </p>
      </header>

      <HabitSection
        title="Break resets"
        hint="Suggested when a session's warning or check-in fires."
        habits={breakList}
        state={state}
        today={today}
        week={week}
        onToggleToday={(id) => setState((prev) => toggleHabitToday(prev, id))}
        onEdit={startEdit}
        onArchive={(id) => setState((prev) => archiveHabit(prev, id))}
        onAdd={() => startAdd("break")}
      />

      <HabitSection
        title="Routines"
        hint="General recurring habits, tracked here only."
        habits={routineList}
        state={state}
        today={today}
        week={week}
        onToggleToday={(id) => setState((prev) => toggleHabitToday(prev, id))}
        onEdit={startEdit}
        onArchive={(id) => setState((prev) => archiveHabit(prev, id))}
        onAdd={() => startAdd("routine")}
      />

      {archived.length > 0 && (
        <div className="mt-8">
          <button
            type="button"
            onClick={() => setShowArchived((v) => !v)}
            className="text-xs font-medium text-faint hover:text-muted"
          >
            {showArchived ? "Hide" : "Show"} archived ({archived.length})
          </button>
          {showArchived && (
            <ul className="mt-2 space-y-1">
              {archived.map((h) => (
                <li
                  key={h.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                >
                  <span className="text-faint line-through">{h.name}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setState((prev) => updateHabit(prev, h.id, { archivedAt: null }))
                    }
                    className="text-xs font-medium text-accent hover:text-accent-ink"
                  >
                    Restore
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {draft && (
        <HabitDraftForm
          draft={draft}
          onChange={setDraft}
          onCancel={() => setDraft(null)}
          onSave={saveDraft}
        />
      )}
    </div>
  );
}

function HabitSection({
  title,
  hint,
  habits,
  state,
  today,
  week,
  onToggleToday,
  onEdit,
  onArchive,
  onAdd,
}: {
  title: string;
  hint: string;
  habits: Habit[];
  state: HabitsState;
  today: string;
  week: string[];
  onToggleToday: (id: string) => void;
  onEdit: (habit: Habit) => void;
  onArchive: (id: string) => void;
  onAdd: () => void;
}) {
  return (
    <section className="mt-6">
      <div className="flex items-baseline justify-between">
        <div>
          <h2 className="font-display text-base font-semibold text-ink">{title}</h2>
          <p className="text-xs text-faint">{hint}</p>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted hover:border-accent hover:text-accent"
        >
          + Add
        </button>
      </div>

      {habits.length === 0 ? (
        <p className="mt-3 rounded-lg border border-dashed border-border px-3 py-4 text-center text-sm text-faint">
          Nothing here yet.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {habits.map((habit) => (
            <HabitRow
              key={habit.id}
              habit={habit}
              done={habitDoneOnDate(state, habit.id, today)}
              week={week}
              state={state}
              onToggleToday={() => onToggleToday(habit.id)}
              onEdit={() => onEdit(habit)}
              onArchive={() => onArchive(habit.id)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function HabitRow({
  habit,
  done,
  week,
  state,
  onToggleToday,
  onEdit,
  onArchive,
}: {
  habit: Habit;
  done: boolean;
  week: string[];
  state: HabitsState;
  onToggleToday: () => void;
  onEdit: () => void;
  onArchive: () => void;
}) {
  const count = weeklyCount(state, habit.id, week);
  return (
    <li
      className={[
        "rounded-lg border bg-surface px-3.5 py-3 transition-colors",
        done ? "border-accent/40" : "border-border",
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          aria-pressed={done}
          aria-label={`Mark ${habit.name} done today`}
          onClick={onToggleToday}
          className={[
            "mt-0.5 grid h-6 w-6 flex-none place-items-center rounded-full border-[1.5px] transition-colors",
            done ? "border-accent bg-accent" : "border-border bg-transparent",
          ].join(" ")}
        >
          {done && (
            <svg viewBox="0 0 24 24" className="h-3 w-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
              <path d="m5 12 5 5 9-9" />
            </svg>
          )}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className={["text-sm font-medium", done ? "text-muted" : "text-ink"].join(" ")}>{habit.name}</span>
            {habit.targetPerWeek ? (
              <span className="flex-none text-xs text-faint">
                {count}/{habit.targetPerWeek} this week
              </span>
            ) : null}
          </div>
          {habit.note && <p className="mt-0.5 text-xs text-muted">{habit.note}</p>}
          <div className="mt-2 flex items-center gap-2.5">
            <div className="flex gap-1">
              {week.map((d) => (
                <span
                  key={d}
                  title={d}
                  className={[
                    "h-1.5 w-1.5 rounded-full",
                    habitDoneOnDate(state, habit.id, d) ? "bg-accent" : "bg-border",
                  ].join(" ")}
                />
              ))}
            </div>
            <button type="button" onClick={onEdit} className="text-xs text-faint hover:text-accent">
              Edit
            </button>
            <button type="button" onClick={onArchive} className="text-xs text-faint hover:text-danger">
              Archive
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}

function HabitDraftForm({
  draft,
  onChange,
  onCancel,
  onSave,
}: {
  draft: DraftHabit;
  onChange: (d: DraftHabit) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <div
      role="dialog"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4 md:items-center"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-border bg-surface p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display text-lg font-semibold text-ink">
          {draft.id ? "Edit habit" : "New habit"}
        </h3>

        <div className="mt-4 flex gap-1.5">
          {(["break", "routine"] as HabitType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onChange({ ...draft, type: t })}
              className={[
                "flex-1 rounded-lg border px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                draft.type === t ? "border-accent bg-accent-soft text-accent" : "border-border text-muted",
              ].join(" ")}
            >
              {t === "break" ? "Break reset" : "Routine"}
            </button>
          ))}
        </div>

        {draft.type === "break" && !draft.name && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {BREAK_SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onChange({ ...draft, name: s })}
                className="rounded-full border border-border px-2.5 py-1 text-xs text-muted hover:border-accent hover:text-accent"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <input
          autoFocus
          value={draft.name}
          onChange={(e) => onChange({ ...draft, name: e.target.value })}
          placeholder="Name"
          className="mt-3 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-accent"
        />
        <input
          value={draft.note}
          onChange={(e) => onChange({ ...draft, note: e.target.value })}
          placeholder="Note (optional)"
          className="mt-2 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-accent"
        />
        <input
          value={draft.targetPerWeek}
          onChange={(e) => onChange({ ...draft, targetPerWeek: e.target.value.replace(/[^0-9]/g, "") })}
          placeholder="Weekly target (optional)"
          inputMode="numeric"
          className="mt-2 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-accent"
        />

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-lg border border-border py-2 text-sm font-medium text-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={!draft.name.trim()}
            className="flex-1 rounded-lg bg-accent py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
