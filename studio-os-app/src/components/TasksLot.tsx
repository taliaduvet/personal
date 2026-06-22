"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTasks } from "@/lib/store";
import { useSettings } from "@/lib/settings-store";
import { openTaskWork } from "@/lib/navigation";
import type { LensId, Task } from "@/lib/types";
import {
  deadlineLabel,
  groupTasks,
  lifeAreaName,
  planLabel,
  projectName,
  searchTasks,
} from "@/lib/lenses";
import { TaskCard } from "@/components/TaskCard";

const LENSES: { id: LensId; label: string }[] = [
  { id: "area", label: "Life Area" },
  { id: "project", label: "Project" },
  { id: "when", label: "When" },
  { id: "mode", label: "Mode · optional" },
];

export function TasksLot() {
  const router = useRouter();
  const { tasks, completeTask, openQuickEdit } = useTasks();
  const { weekStartsOn } = useSettings();
  const [lens, setLens] = useState<LensId>("area");
  const [query, setQuery] = useState("");

  const groups = useMemo(() => groupTasks(tasks, lens, weekStartsOn), [tasks, lens, weekStartsOn]);
  const results = useMemo(() => searchTasks(tasks, query, weekStartsOn), [tasks, query, weekStartsOn]);
  const searching = query.trim().length > 0;
  const lotCount = groups.reduce((n, g) => n + g.tasks.length, 0);

  const complete = completeTask;

  return (
    <section>
      <div className="flex items-baseline justify-between">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">Tasks</h1>
        {!searching && <span className="text-sm text-muted">{lotCount} in the lot</span>}
      </div>
      <p className="mt-1 text-muted">Everything that isn&apos;t in Today — one lens at a time.</p>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search everything — including done…"
        className="mt-4 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none placeholder:text-faint focus:border-accent"
      />

      {searching ? (
        <SearchResults results={results} onComplete={complete} onOpenWork={(id) => openTaskWork(router, id)} onQuickEdit={openQuickEdit} />
      ) : (
        <>
          <div className="mt-4 inline-flex rounded-lg border border-border bg-surface p-0.5">
            {LENSES.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => setLens(l.id)}
                className={[
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  lens === l.id ? "bg-accent text-white" : "text-muted hover:text-ink",
                ].join(" ")}
              >
                {l.label}
              </button>
            ))}
          </div>

          {/* The board: every group is a column, all tasks visible at once. */}
          <div
            className="mt-4"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(232px, 1fr))",
              gap: 12,
              alignItems: "start",
            }}
          >
            {groups.map((g) => (
              <div key={g.key} className="rounded-xl border border-border bg-surface">
                <div className="flex items-center gap-2 border-b border-line px-3 py-2">
                  {g.color && <span className="h-2 w-2 rounded-full" style={{ background: g.color }} />}
                  <span className="text-sm font-medium text-ink">{g.label}</span>
                  <span className="ml-auto text-xs text-faint">{g.tasks.length}</span>
                </div>
                <div className="space-y-2 p-2">
                  {g.tasks.map((t) => (
                    <TaskCard
                      key={t.id}
                      task={t}
                      onComplete={complete}
                      hideArea={lens === "area"}
                      hideProject={lens === "project"}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function SearchResults({
  results,
  onComplete,
  onOpenWork,
  onQuickEdit,
}: {
  results: Task[];
  onComplete: (id: string) => void;
  onOpenWork: (id: string) => void;
  onQuickEdit: (id: string) => void;
}) {
  if (results.length === 0) {
    return (
      <p className="mt-6 text-sm text-muted">
        No matches. Try &ldquo;grant&rdquo;, &ldquo;venue&rdquo;, or &ldquo;rent&rdquo;.
      </p>
    );
  }
  return (
    <div className="mt-4 max-w-3xl">
      <p className="mb-2 text-xs uppercase tracking-wide text-faint">
        {results.length} result{results.length > 1 ? "s" : ""} across everything
      </p>
      <div className="space-y-2">
        {results.map((t) => (
          <div key={t.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2.5">
            <div className="min-w-0 flex-1">
              <button type="button" onClick={() => onOpenWork(t.id)} className="block w-full text-left">
                <p className={["text-sm", t.status === "done" ? "text-faint line-through" : "text-ink"].join(" ")}>
                  {t.title}
                </p>
              </button>
              <button type="button" onClick={() => onQuickEdit(t.id)} className="mt-0.5 truncate text-xs text-muted hover:text-accent">
                {lifeAreaName(t.lifeAreaId)} · {projectName(t.projectId)} · classify
              </button>
            </div>
            <StatusBadge task={t} onComplete={onComplete} />
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ task, onComplete }: { task: Task; onComplete: (id: string) => void }) {
  const { weekStartsOn } = useSettings();
  if (task.status === "done") {
    return <span className="shrink-0 rounded-full bg-canvas px-2 py-0.5 text-xs text-muted">Done</span>;
  }
  const deadline = deadlineLabel(task.deadlineInDays);
  const plan = planLabel(task.doPlan, weekStartsOn);
  const label = task.inToday
    ? "In Today"
    : deadline
      ? deadline.text
      : task.status === "in_progress"
        ? "In progress"
        : plan
          ? plan
          : "Someday";
  const tone = deadline && deadline.tone === "danger" && !task.inToday ? "text-danger" : "text-muted";
  return (
    <button
      type="button"
      onClick={() => onComplete(task.id)}
      className={["shrink-0 rounded-full bg-canvas px-2 py-0.5 text-xs hover:text-accent", tone].join(" ")}
      title="Mark complete"
    >
      {label}
    </button>
  );
}
