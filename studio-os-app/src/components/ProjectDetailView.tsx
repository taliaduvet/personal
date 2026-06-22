"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTasks } from "@/lib/store";
import { useProjects } from "@/lib/projects-store";
import { useSettings } from "@/lib/settings-store";
import { returnFromProjectDetail } from "@/lib/navigation";
import { TaskCard } from "@/components/TaskCard";
import { ProjectLinksSidebar } from "@/components/ProjectLinksSidebar";
import { ProjectForm } from "@/components/ProjectForm";

export function ProjectDetailView({ projectId }: { projectId: string }) {
  const router = useRouter();
  const returnTo = useCallback(() => returnFromProjectDetail(router), [router]);
  const { getProject, updateProject, deleteProject, isLocalProject } = useProjects();
  const { lifeAreas } = useSettings();
  const { tasks, completeTask } = useTasks();
  const [editing, setEditing] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const project = getProject(projectId);
  const area = project ? lifeAreas.find((a) => a.id === project.lifeAreaId) : null;

  const { active, done } = useMemo(() => {
    const mine = tasks.filter((t) => t.projectId === projectId);
    return {
      active: mine.filter((t) => t.status !== "done"),
      done: mine.filter((t) => t.status === "done"),
    };
  }, [tasks, projectId]);

  if (!project) {
    return (
      <section className="mx-auto max-w-2xl px-4 py-12 text-center">
        <p className="font-display text-lg font-semibold text-ink">Project not found</p>
        <button
          type="button"
          onClick={returnTo}
          className="mt-2 text-sm text-accent hover:text-accent-ink"
        >
          ← Back to projects
        </button>
      </section>
    );
  }

  const color = area?.color ?? "#5b61e8";

  function handleDelete() {
    const err = deleteProject(projectId);
    if (err) {
      setDeleteError(err);
      return;
    }
    returnTo();
  }

  return (
    <div className="mx-auto min-h-[calc(100dvh-8rem)] max-w-5xl pb-24">
      <header className="flex items-center justify-between border-b border-line py-3">
        <button type="button" onClick={returnTo} className="text-sm font-medium text-muted hover:text-ink">
          ← Back
        </button>
        <div className="flex items-center gap-3">
          {area && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted">
              <span className="h-2 w-2 rounded-full" style={{ background: color }} />
              {area.name}
            </span>
          )}
          {!editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-xs font-medium text-accent hover:text-accent-ink"
            >
              Edit
            </button>
          )}
        </div>
      </header>

      <div className="border-b border-line py-6">
        {editing ? (
          <ProjectForm
            lifeAreas={lifeAreas}
            initial={{
              name: project.name,
              why: project.why,
              lifeAreaId: project.lifeAreaId,
            }}
            submitLabel="Save changes"
            onSubmit={(draft) => {
              updateProject(projectId, draft);
              setEditing(false);
            }}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-ink md:text-[2rem]">
              {project.name}
            </h1>
            {project.why ? (
              <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted">
                &ldquo;{project.why}&rdquo;
              </p>
            ) : (
              <p className="mt-3 text-sm text-muted">What is this initiative for? Tap Edit to add a why.</p>
            )}
            <div className="mt-4 flex flex-wrap gap-3">
              {isLocalProject(projectId) && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="text-xs text-muted hover:text-[#bc6740]"
                >
                  Delete project
                </button>
              )}
              {deleteError && <p className="text-xs text-[#bc6740]">{deleteError}</p>}
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 items-start gap-8 py-6 lg:grid-cols-[minmax(0,1fr)_260px] lg:gap-10">
        <section>
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-lg font-semibold text-ink">Tasks</h2>
            <span className="text-xs text-muted">
              {active.length > 0
                ? `${active.length} active`
                : done.length > 0
                  ? "All done"
                  : "None yet"}
            </span>
          </div>

          {active.length > 0 ? (
            <div className="mt-4 space-y-2">
              {active.map((t) => (
                <TaskCard key={t.id} task={t} onComplete={completeTask} hideProject />
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted">
              {done.length > 0
                ? "Everything active here is done."
                : "Open a task and assign it to this project to get moving."}
            </p>
          )}

          {done.length > 0 && (
            <details className="mt-8 group">
              <summary className="cursor-pointer text-sm font-medium text-muted hover:text-ink">
                Completed ({done.length})
              </summary>
              <div className="mt-3 space-y-2 opacity-80">
                {done.map((t) => (
                  <TaskCard key={t.id} task={t} onComplete={completeTask} hideProject />
                ))}
              </div>
            </details>
          )}
        </section>

        <ProjectLinksSidebar project={project} />
      </div>
    </div>
  );
}
