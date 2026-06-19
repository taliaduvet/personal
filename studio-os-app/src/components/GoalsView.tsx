"use client";

import { useMemo } from "react";
import { useTasks } from "@/lib/store";
import { GOALS, LIFE_AREAS } from "@/lib/sample-data";
import { lifeAreaColor, lifeAreaName, projectName } from "@/lib/lenses";
import type { Goal, Task } from "@/lib/types";

function targetLabel(targetInDays: number | null): string {
  if (targetInDays === null) return "No target date";
  if (targetInDays <= 0) return "Target today";
  if (targetInDays === 1) return "Target tomorrow";
  if (targetInDays <= 30) return `Target in ${targetInDays}d`;
  return `Target in ~${Math.round(targetInDays / 7)}w`;
}

/** A goal's scope = its project's tasks, or — if no project — the whole life area. */
function scopeTasks(goal: Goal, tasks: Task[]): Task[] {
  return tasks.filter((t) =>
    goal.projectId ? t.projectId === goal.projectId : t.lifeAreaId === goal.lifeAreaId
  );
}

export function GoalsView() {
  const { tasks } = useTasks();

  const grouped = useMemo(
    () =>
      LIFE_AREAS.map((a) => ({ area: a, goals: GOALS.filter((g) => g.lifeAreaId === a.id) })).filter(
        (g) => g.goals.length > 0
      ),
    []
  );

  return (
    <section className="mx-auto max-w-3xl">
      <div className="flex items-baseline justify-between">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">Goals</h1>
        <span className="text-sm text-muted">{GOALS.length} in motion</span>
      </div>
      <p className="mt-1 text-muted">The bigger why. Progress is counted from the tasks underneath — no manual updating.</p>

      {grouped.map(({ area, goals }) => (
        <div key={area.id} className="mt-7">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: area.color }} />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{area.name}</h2>
          </div>
          <div className="mt-3 space-y-3">
            {goals.map((g) => (
              <GoalCard key={g.id} goal={g} tasks={tasks} />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

function GoalCard({ goal, tasks }: { goal: Goal; tasks: Task[] }) {
  const color = lifeAreaColor(goal.lifeAreaId);
  const mine = scopeTasks(goal, tasks);
  const done = mine.filter((t) => t.status === "done").length;
  const total = mine.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const scope = goal.projectId ? projectName(goal.projectId) : `Across ${lifeAreaName(goal.lifeAreaId)}`;

  return (
    <div className="rounded-xl border border-border bg-surface p-4" style={{ borderLeft: `3px solid ${color}` }}>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-display text-base font-semibold text-ink">{goal.name}</h3>
        <span className="shrink-0 text-xs text-faint">{targetLabel(goal.targetInDays)}</span>
      </div>

      <div className="mt-2 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-canvas">
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
        </div>
        <span className="w-9 shrink-0 text-right text-xs tabular-nums text-faint">{pct}%</span>
      </div>

      <p className="mt-2 text-xs text-muted">
        {scope}
        {total > 0 ? ` · ${done} of ${total} tasks done` : " · no tasks yet"}
      </p>
    </div>
  );
}
