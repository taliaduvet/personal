"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTasks } from "@/lib/store";
import { useProjects } from "@/lib/projects-store";
import { useSettings } from "@/lib/settings-store";
import { openProjectDetail } from "@/lib/navigation";
import { ProjectForm } from "@/components/ProjectForm";
import type { Project } from "@/lib/types";
import { FolderIcon } from "@/components/icons";

export function ProjectsView() {
  const router = useRouter();
  const { tasks } = useTasks();
  const { projects, createProject } = useProjects();
  const { lifeAreas } = useSettings();
  const [showNew, setShowNew] = useState(false);
  const [newAreaId, setNewAreaId] = useState<string | null>(null);

  const areas = useMemo(
    () =>
      lifeAreas.map((a) => ({
        area: a,
        projects: projects.filter((p) => p.lifeAreaId === a.id),
      })),
    [lifeAreas, projects]
  );

  function handleCreate(draft: Parameters<typeof createProject>[0]) {
    const created = createProject(draft);
    setShowNew(false);
    setNewAreaId(null);
    openProjectDetail(router, created.id);
  }

  return (
    <section className="mx-auto max-w-3xl">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">Projects</h1>
          <p className="mt-1 text-muted">
            Initiatives inside each life area — tap one to open its workspace and tasks.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowNew(true);
            setNewAreaId(null);
          }}
          className="shrink-0 rounded-lg border border-border bg-canvas px-3 py-1.5 text-sm font-medium text-accent hover:border-accent/40"
        >
          + New project
        </button>
      </div>

      {showNew && !newAreaId && (
        <div className="mt-5">
          <ProjectForm
            lifeAreas={lifeAreas}
            submitLabel="Create project"
            onSubmit={handleCreate}
            onCancel={() => setShowNew(false)}
          />
        </div>
      )}

      {areas.map(({ area, projects: areaProjects }) => (
        <div key={area.id} className="mt-7">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: area.color }} />
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{area.name}</h2>
            </div>
            <button
              type="button"
              onClick={() => {
                setNewAreaId(area.id);
                setShowNew(true);
              }}
              className="text-xs text-muted hover:text-accent"
            >
              + Add
            </button>
          </div>

          {showNew && newAreaId === area.id && (
            <div className="mt-3">
              <ProjectForm
                lifeAreas={lifeAreas}
                initial={{ lifeAreaId: area.id }}
                submitLabel="Create project"
                onSubmit={handleCreate}
                onCancel={() => {
                  setShowNew(false);
                  setNewAreaId(null);
                }}
              />
            </div>
          )}

          {areaProjects.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No projects here yet.</p>
          ) : (
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
          )}
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
  const peopleCount = project.personIds?.length ?? 0;
  const linkHint =
    hasFolder && docCount > 0
      ? "Folder + docs"
      : hasFolder
        ? "Drive linked"
        : docCount > 0
          ? `${docCount} doc${docCount === 1 ? "" : "s"}`
          : peopleCount > 0
            ? `${peopleCount} people`
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
