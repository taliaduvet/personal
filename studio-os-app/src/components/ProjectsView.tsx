"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTasks } from "@/lib/store";
import { useProjects } from "@/lib/projects-store";
import { LIFE_AREAS } from "@/lib/sample-data";
import { openProjectDetail } from "@/lib/navigation";
import type { Project } from "@/lib/types";
import { FolderIcon } from "@/components/icons";

export function ProjectsView() {
  const router = useRouter();
  const { tasks } = useTasks();
  const { projects } = useProjects();

  const areas = useMemo(
    () =>
      LIFE_AREAS.map((a) => ({ area: a, projects: projects.filter((p) => p.lifeAreaId === a.id) })).filter(
        (g) => g.projects.length > 0
      ),
    [projects]
  );

  return (
    <section className="mx-auto max-w-3xl">
      <div className="flex items-baseline justify-between">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">Projects</h1>
        <span className="text-sm text-muted">{projects.length} initiatives</span>
      </div>
      <p className="mt-1 text-muted">
        Initiatives inside each life area — tap one to open its workspace and tasks.
      </p>

      {areas.map(({ area, projects: areaProjects }) => (
        <div key={area.id} className="mt-7">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: area.color }} />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{area.name}</h2>
          </div>
          <div className="mt-3 space-y-2">
            {areaProjects.map((p) => (
              <ProjectRow
                key={p.id}
                project={p}
                color={area.color}
                activeCount={tasks.filter((t) => t.projectId === p.id && t.status !== "done").length}
                onOpen={() => openProjectDetail(router, p.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

function ProjectRow({
  project,
  color,
  activeCount,
  onOpen,
}: {
  project: Project;
  color: string;
  activeCount: number;
  onOpen: () => void;
}) {
  const hasFolder = Boolean(project.driveFolder);
  const docCount = project.driveDocs?.length ?? 0;
  const linkHint =
    hasFolder && docCount > 0
      ? "Folder + docs"
      : hasFolder
        ? "Drive linked"
        : docCount > 0
          ? `${docCount} doc${docCount === 1 ? "" : "s"}`
          : null;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-start gap-3 rounded-xl border border-border bg-surface p-4 text-left transition-colors hover:border-accent/40 hover:bg-canvas/40"
      style={{ borderLeft: `3px solid ${color}` }}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-display text-base font-semibold text-ink">{project.name}</h3>
          <span className="shrink-0 text-xs text-muted">
            {activeCount > 0 ? `${activeCount} active` : "Open"}
          </span>
        </div>
        {project.why && (
          <p className="mt-1 line-clamp-2 text-sm text-muted">&ldquo;{project.why}&rdquo;</p>
        )}
        {linkHint && (
          <span className="mt-2 inline-flex items-center gap-1 text-xs text-muted">
            {hasFolder && <FolderIcon className="h-3.5 w-3.5 text-accent" aria-hidden />}
            {linkHint}
          </span>
        )}
      </div>
      <span className="mt-0.5 shrink-0 text-muted" aria-hidden>
        →
      </span>
    </button>
  );
}
