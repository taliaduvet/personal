"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSessions, type SessionNudgeKind } from "@/lib/sessions-store";
import { useTasks } from "@/lib/store";
import { newActivityLogId } from "@/lib/activity-log";
import {
  breakHabits,
  loadHabitsState,
  saveHabitsState,
  toggleHabitToday,
  type Habit,
  type HabitsState,
} from "@/lib/habits";

const EMPTY: HabitsState = { habits: [], days: {} };

const TITLE: Record<SessionNudgeKind, (task: string) => string> = {
  warning: (t) => `5 min left on ${t} — start wrapping up?`,
  "times-up": (t) => `Time's up on ${t}.`,
  "ambient-checkin": (t) => `You've been sitting with ${t} a while — need a reset?`,
};

/**
 * Non-modal, globally mounted. Shows the session transition-warning /
 * times-up / ambient-hyperfocus nudge with a break-habit suggestion pulled
 * from the Habits system (never Practice — fully separate systems).
 */
export function SessionNudgeBanner() {
  const { activeSession, activeTaskTitle, activeNudge, dismissNudge, acknowledgeAmbientNudge, requestEndSession } =
    useSessions();
  const { appendActivityLog } = useTasks();
  const [habits, setHabits] = useState<HabitsState>(EMPTY);

  useEffect(() => {
    if (activeNudge) setHabits(loadHabitsState());
  }, [activeNudge]);

  if (!activeNudge || !activeSession) return null;

  const nudge = activeNudge;
  const session = activeSession;
  const title = activeTaskTitle?.trim() || "this";
  const suggestions = breakHabits(habits).slice(0, 2);

  function markDone(habit: Habit) {
    const next = toggleHabitToday(habits, habit.id);
    setHabits(next);
    saveHabitsState(next);
    appendActivityLog({
      id: newActivityLogId(),
      atIso: new Date().toISOString(),
      kind: "session_break_taken",
      taskId: session.taskId,
      projectId: session.projectId,
      habitId: habit.id,
      trigger: nudge,
    });
    dismissNudge();
  }

  return (
    <div className="fixed inset-x-0 bottom-32 z-40 flex justify-center px-4 md:bottom-6">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-4 shadow-lg">
        <p className="text-sm font-medium text-ink">{TITLE[nudge](title)}</p>

        {suggestions.length > 0 ? (
          <div className="mt-3 space-y-1.5">
            {suggestions.map((h) => (
              <button
                key={h.id}
                type="button"
                onClick={() => markDone(h)}
                className="flex w-full items-center justify-between rounded-lg border border-border bg-canvas px-3 py-2 text-left text-sm text-ink transition-colors hover:border-accent"
              >
                <span>{h.name}</span>
                <span className="text-xs font-medium text-accent">Log it</span>
              </button>
            ))}
          </div>
        ) : (
          <Link href="/habits" className="mt-3 inline-block text-xs font-medium text-accent hover:text-accent-ink">
            Add a break habit →
          </Link>
        )}

        <div className="mt-3 flex items-center justify-between gap-2">
          {nudge === "times-up" ? (
            <>
              <button type="button" onClick={dismissNudge} className="text-xs font-medium text-muted hover:text-ink">
                Keep sitting
              </button>
              <button
                type="button"
                onClick={() => {
                  dismissNudge();
                  requestEndSession();
                }}
                className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-ink"
              >
                End session
              </button>
            </>
          ) : nudge === "ambient-checkin" ? (
            <>
              <button type="button" onClick={dismissNudge} className="text-xs font-medium text-muted hover:text-ink">
                Not now
              </button>
              <button
                type="button"
                onClick={acknowledgeAmbientNudge}
                className="text-xs font-medium text-faint hover:text-muted"
              >
                Acknowledge — stop asking this session
              </button>
            </>
          ) : (
            <button type="button" onClick={dismissNudge} className="text-xs font-medium text-muted hover:text-ink">
              Keep going
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
