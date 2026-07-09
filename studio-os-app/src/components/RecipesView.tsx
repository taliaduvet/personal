"use client";

import { useMemo, useState } from "react";
import { useTasks } from "@/lib/store";
import { useSettings } from "@/lib/settings-store";
import { useProjects } from "@/lib/projects-store";
import {
  deadlineInDaysForMilestone,
  defaultMilestones,
  newMilestoneId,
  newRecipeId,
} from "@/lib/recipes";
import { formatRelativeDayOffset } from "@/lib/time-display";
import type { Recipe, RecipeMilestone } from "@/lib/types";

export function RecipesView() {
  const { recipes, saveRecipe, deleteRecipe, applyRecipe, updateRecipeAnchor } = useTasks();
  const { lifeAreas } = useSettings();
  const { projects } = useProjects();
  const [editingId, setEditingId] = useState<string | null>(null);

  const editing = useMemo(
    () => recipes.find((r) => r.id === editingId) ?? null,
    [recipes, editingId]
  );

  function startNew() {
    const area = lifeAreas[0]?.id ?? "music";
    const recipe: Recipe = {
      id: newRecipeId(),
      name: "New release",
      projectId: projects[0]?.id ?? null,
      lifeAreaId: area,
      anchorDate: defaultAnchorDate(),
      milestones: defaultMilestones(),
      createdAt: Date.now(),
    };
    saveRecipe(recipe);
    setEditingId(recipe.id);
  }

  return (
    <section>
      <header className="flex items-baseline justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">Recipes</h1>
          <p className="mt-1 text-muted">Plan backward from an anchor date — milestones become tasks.</p>
        </div>
        <button
          type="button"
          onClick={startNew}
          className="shrink-0 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-ink"
        >
          New recipe
        </button>
      </header>

      {recipes.length === 0 && !editing ? (
        <p className="mt-8 text-sm text-muted">
          No recipes yet. Create one for a release, grant deadline, or any immovable date on the horizon.
        </p>
      ) : (
        <div className="mt-6 space-y-4">
          {recipes.map((r) => (
            <RecipeCard
              key={r.id}
              recipe={r}
              expanded={editingId === r.id}
              onToggle={() => setEditingId(editingId === r.id ? null : r.id)}
              onSave={saveRecipe}
              onDelete={() => {
                deleteRecipe(r.id);
                if (editingId === r.id) setEditingId(null);
              }}
              onApply={() => applyRecipe(r.id)}
              onAnchorChange={(d) => updateRecipeAnchor(r.id, d)}
              lifeAreas={lifeAreas}
              projects={projects}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function defaultAnchorDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 28);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function RecipeCard({
  recipe,
  expanded,
  onToggle,
  onSave,
  onDelete,
  onApply,
  onAnchorChange,
  lifeAreas,
  projects,
}: {
  recipe: Recipe;
  expanded: boolean;
  onToggle: () => void;
  onSave: (r: Recipe) => void;
  onDelete: () => void;
  onApply: () => void;
  onAnchorChange: (anchorDate: string) => void;
  lifeAreas: { id: string; name: string }[];
  projects: { id: string; name: string; lifeAreaId: string }[];
}) {
  const anchorOffset = deadlineInDaysForMilestone(recipe.anchorDate, 0);
  const anchorLabel = formatRelativeDayOffset(anchorOffset);

  function patch(partial: Partial<Recipe>) {
    onSave({ ...recipe, ...partial });
  }

  function patchMilestone(id: string, partial: Partial<RecipeMilestone>) {
    onSave({
      ...recipe,
      milestones: recipe.milestones.map((m) => (m.id === id ? { ...m, ...partial } : m)),
    });
  }

  function addMilestone() {
    onSave({
      ...recipe,
      milestones: [
        ...recipe.milestones,
        { id: newMilestoneId(), title: "Milestone", offsetDays: -7, workModeId: null },
      ],
    });
  }

  return (
    <div className="rounded-xl border border-border bg-surface">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-baseline justify-between gap-3 px-4 py-3 text-left"
      >
        <div>
          <p className="font-display text-base font-semibold text-ink">{recipe.name}</p>
          <p className="mt-0.5 text-xs text-muted">
            Anchor · {recipe.anchorDate} · {anchorLabel}
          </p>
        </div>
        <span className="text-xs text-faint">{recipe.milestones.length} milestones</span>
      </button>

      {expanded && (
        <div className="border-t border-line px-4 py-4 space-y-4">
          <label className="block">
            <span className="text-xs font-medium text-muted">Name</span>
            <input
              value={recipe.name}
              onChange={(e) => patch({ name: e.target.value })}
              className="mt-1 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-accent"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-medium text-muted">Anchor date</span>
              <input
                type="date"
                value={recipe.anchorDate}
                onChange={(e) => onAnchorChange(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-accent"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-muted">Life area</span>
              <select
                value={recipe.lifeAreaId}
                onChange={(e) => patch({ lifeAreaId: e.target.value })}
                className="mt-1 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-accent"
              >
                {lifeAreas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="text-xs font-medium text-muted">Project (optional)</span>
            <select
              value={recipe.projectId ?? ""}
              onChange={(e) =>
                patch({
                  projectId: e.target.value || null,
                  lifeAreaId:
                    projects.find((p) => p.id === e.target.value)?.lifeAreaId ?? recipe.lifeAreaId,
                })
              }
              className="mt-1 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-accent"
            >
              <option value="">None</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-faint">Milestone chain</p>
            <ul className="mt-2 space-y-2">
              {[...recipe.milestones]
                .sort((a, b) => a.offsetDays - b.offsetDays)
                .map((m) => {
                  const days = deadlineInDaysForMilestone(recipe.anchorDate, m.offsetDays);
                  return (
                    <li key={m.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-canvas px-3 py-2">
                      <input
                        value={m.title}
                        onChange={(e) => patchMilestone(m.id, { title: e.target.value })}
                        className="min-w-[8rem] flex-1 bg-transparent text-sm text-ink outline-none"
                      />
                      <input
                        type="number"
                        value={m.offsetDays}
                        onChange={(e) =>
                          patchMilestone(m.id, { offsetDays: Number(e.target.value) || 0 })
                        }
                        title="Days from anchor (negative = before)"
                        className="w-16 rounded border border-border bg-surface px-2 py-1 text-sm text-ink"
                      />
                      <span className="text-xs text-faint">{formatRelativeDayOffset(days)}</span>
                    </li>
                  );
                })}
            </ul>
            <button
              type="button"
              onClick={addMilestone}
              className="mt-2 text-sm font-medium text-accent hover:text-accent-ink"
            >
              + Add milestone
            </button>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="button"
              onClick={onApply}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-ink"
            >
              Generate tasks
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:text-danger"
            >
              Delete recipe
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
