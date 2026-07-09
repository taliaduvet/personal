import { localDateKey, dateKeyStartMs } from "./local-date";
import type { Recipe, RecipeMilestone, Task } from "./types";

export function newRecipeId(): string {
  return `rcp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function newMilestoneId(): string {
  return `ms-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Days from today until the milestone date (anchor + offset). */
export function deadlineInDaysForMilestone(anchorDate: string, offsetDays: number, now = new Date()): number {
  const anchorMs = dateKeyStartMs(anchorDate);
  const targetMs = anchorMs + offsetDays * 86_400_000;
  const todayKey = localDateKey(now);
  const todayMs = dateKeyStartMs(todayKey);
  return Math.round((targetMs - todayMs) / 86_400_000);
}

export function tasksForRecipe(tasks: Task[], recipeId: string): Task[] {
  return tasks.filter((t) => t.recipeId === recipeId);
}

export function applyRecipeMilestones(
  recipe: Recipe,
  tasks: Task[],
  createTask: (milestone: RecipeMilestone) => Task
): { nextTasks: Task[]; created: Task[] } {
  const linked = new Map(
    tasksForRecipe(tasks, recipe.id)
      .filter((t) => t.milestoneId)
      .map((t) => [t.milestoneId!, t])
  );
  const created: Task[] = [];
  const updated = new Map<string, Task>();

  for (const milestone of recipe.milestones) {
    const deadline = deadlineInDaysForMilestone(recipe.anchorDate, milestone.offsetDays);
    const existing = linked.get(milestone.id);
    if (existing) {
      updated.set(existing.id, {
        ...existing,
        title: milestone.title,
        workModeId: milestone.workModeId ?? existing.workModeId,
        deadlineInDays: deadline,
        projectId: recipe.projectId ?? existing.projectId,
        lifeAreaId: recipe.lifeAreaId,
      });
    } else {
      const task = {
        ...createTask(milestone),
        recipeId: recipe.id,
        milestoneId: milestone.id,
        deadlineInDays: deadline,
        projectId: recipe.projectId,
        lifeAreaId: recipe.lifeAreaId,
        workModeId: milestone.workModeId ?? null,
        title: milestone.title,
      };
      created.push(task);
    }
  }

  let nextTasks = tasks.map((t) => updated.get(t.id) ?? t);
  nextTasks = [...created, ...nextTasks];
  return { nextTasks, created };
}

export function shiftRecipeTasks(recipe: Recipe, tasks: Task[]): Task[] {
  const linked = tasksForRecipe(tasks, recipe.id);
  if (linked.length === 0) return tasks;
  const milestoneById = new Map(recipe.milestones.map((m) => [m.id, m]));
  const patchIds = new Set(linked.map((t) => t.id));

  return tasks.map((t) => {
    if (!patchIds.has(t.id) || !t.milestoneId) return t;
    const milestone = milestoneById.get(t.milestoneId);
    if (!milestone) return t;
    return {
      ...t,
      deadlineInDays: deadlineInDaysForMilestone(recipe.anchorDate, milestone.offsetDays),
    };
  });
}

export function defaultMilestones(): RecipeMilestone[] {
  return [
    { id: newMilestoneId(), title: "Artwork due", offsetDays: -21, workModeId: "creative" },
    { id: newMilestoneId(), title: "Press photos", offsetDays: -14, workModeId: "outreach" },
    { id: newMilestoneId(), title: "Release day", offsetDays: 0, workModeId: null },
  ];
}
