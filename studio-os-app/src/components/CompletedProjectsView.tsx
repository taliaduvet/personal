"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useProjects } from "@/lib/projects-store";
import { useSettings } from "@/lib/settings-store";
import { lifeAreaColor, lifeAreaName } from "@/lib/lenses";
import { openProjectDetail } from "@/lib/navigation";
import type { Project } from "@/lib/types";

function formatCompletedDate(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function CompletedProjectsView() {
  const { projects } = useProjects();
  const { lifeAreas } = useSettings();
  const router = useRouter();
  const [lifeAreaId, setLifeAreaId] = useState<string | "">("");

  const completed = useMemo(() => {
    const done = projects.filter((p) => p.status === "done");
    const filtered = lifeAreaId ? done.filter((p) => p.lifeAreaId === lifeAreaId) : done;
    return [...filtered].sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));
  }, [projects, lifeAreaId]);

  return (
    <section>
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">Completed projects</h1>
        <p className="mt-1 text-muted">Finished initiatives — kept for the record, out of your active list.</p>
      </header>

      <div className="mt-4 flex flex-wrap gap-2">
        <select
          value={lifeAreaId}
          onChange={(e) => setLifeAreaId(e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent"
        >
          <option value="">All life areas</option>
          {lifeAreas.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>

      {completed.length === 0 ? (
        <p className="mt-8 text-sm text-muted">
          Nothing here yet. Mark a project complete from its page and it&apos;ll show up here.
        </p>
      ) : (
        <div className="mt-6 space-y-2">
          {completed.map((p) => (
            <CompletedProjectRow key={p.id} project={p} onOpen={() => openProjectDetail(router, p.id)} />
          ))}
        </div>
      )}
    </section>
  );
}

function CompletedProjectRow({ project, onOpen }: { project: Project; onOpen: () => void }) {
  const color = lifeAreaColor(project.lifeAreaId);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-start gap-3 rounded-lg border border-border bg-surface px-3 py-2.5 text-left transition-colors hover:border-accent/40 hover:bg-canvas"
      style={{ borderLeft: `3px solid ${color}` }}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink">{project.name}</p>
        {project.why && <p className="mt-0.5 line-clamp-1 text-xs text-muted">&ldquo;{project.why}&rdquo;</p>}
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted">
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
            {lifeAreaName(project.lifeAreaId)}
          </span>
          {project.completedAt && <span className="text-faint">Completed {formatCompletedDate(project.completedAt)}</span>}
        </p>
      </div>
    </button>
  );
}
