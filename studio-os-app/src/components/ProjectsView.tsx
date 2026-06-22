"use client";

import { useMemo } from "react";
import { useTasks } from "@/lib/store";
import { LIFE_AREAS, PROJECTS } from "@/lib/sample-data";
import type { Project, Task } from "@/lib/types";
import { TaskCard } from "@/components/TaskCard";

export function ProjectsView() {
  const { tasks, completeTask } = useTasks();

  const areas = useMemo(
    () =>
      LIFE_AREAS.map((a) => ({ area: a, projects: PROJECTS.filter((p) => p.lifeAreaId === a.id) })).filter(
        (g) => g.projects.length > 0
      ),
    []
  );

  return (
    <section className="mx-auto max-w-3xl">
      <div className="flex items-baseline justify-between">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">Projects</h1>
        <span className="text-sm text-muted">{PROJECTS.length} initiatives</span>
      </div>
      <p className="mt-1 text-muted">Initiatives inside each life area — the &ldquo;why&rdquo; lives here, progress counts itself.</p>

      {areas.map(({ area, projects }) => (
        <div key={area.id} className="mt-7">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: area.color }} />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{area.name}</h2>
          </div>
          <div className="mt-3 space-y-3">
            {projects.map((p) => (
              <ProjectCard key={p.id} project={p} color={area.color} tasks={tasks} onComplete={completeTask} />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

function ProjectCard({
  project,
  color,
  tasks,
  onComplete,
}: {
  project: Project;
  color: string;
  tasks: Task[];
  onComplete: (id: string) => void;
}) {
  const mine = tasks.filter((t) => t.projectId === project.id);
  const done = mine.filter((t) => t.status === "done").length;
  const total = mine.length;
  const active = mine.filter((t) => t.status !== "done");
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="rounded-xl border border-border bg-surface p-4" style={{ borderLeft: `3px solid ${color}` }}>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-display text-base font-semibold text-ink">{project.name}</h3>
        <span className="shrink-0 text-xs text-muted">
          {total > 0 ? `${done}/${total} done` : "No tasks yet"}
        </span>
      </div>

      {project.why && (
        <p className="mt-1 text-sm italic text-muted">&ldquo;{project.why}&rdquo;</p>
      )}

      <div className="mt-3 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-canvas">
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
        </div>
        <span className="w-9 shrink-0 text-right text-xs tabular-nums text-faint">{pct}%</span>
      </div>

      {active.length > 0 ? (
        <div className="mt-3 space-y-2">
          {active.map((t) => (
            <TaskCard key={t.id} task={t} onComplete={onComplete} hideProject />
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted">
          {total > 0 ? "Everything here is done. Nice." : "Nothing queued — open a task and assign it here."}
        </p>
      )}
    </div>
  );
}
