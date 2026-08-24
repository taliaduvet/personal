import type { Task, LensId, LifeArea, TaskGroup, DoPlan } from "./types";
import type { WeekStartDay } from "./week";
import { formatDeadlineDisplay } from "./time-display";
import { getActiveLifeAreas } from "./life-area-registry";
import { getActiveWorkModes } from "./work-mode-registry";
import { activeProjectName, activeProjectWhy, getActiveProjects } from "./project-registry";
import { doPlanLabel, doPlanSortKey, isCarriedDoPlan } from "./do-plan";
import { weekRange } from "./week";
import { isWaitingTask, waitingTasks } from "./waiting-on";

export { isWaitingTask } from "./waiting-on";

const NEUTRAL = "#8b95a1";

/**
 * Life areas are user-defined, so they must be passed in wherever the caller
 * can reach settings. The global registry is only a fallback for call sites
 * that can't — relying on it implicitly is what made the area lens ignore
 * custom areas entirely.
 *
 * Ids are deduped **last-wins**: renaming an area can leave two entries sharing
 * one id, and tasks must still land in exactly one column. Insertion order is
 * kept from first sighting, so a rename doesn't reshuffle the board.
 */
export function resolveLifeAreas(lifeAreas?: LifeArea[]): LifeArea[] {
  const source = lifeAreas && lifeAreas.length > 0 ? lifeAreas : getActiveLifeAreas();
  const byId = new Map<string, LifeArea>();
  for (const area of source) byId.set(area.id, area);
  return [...byId.values()];
}

function lifeAreaMap(lifeAreas?: LifeArea[]): Record<string, LifeArea> {
  return Object.fromEntries(resolveLifeAreas(lifeAreas).map((a) => [a.id, a]));
}

export function lifeAreaName(id: string, lifeAreas?: LifeArea[]): string {
  return lifeAreaMap(lifeAreas)[id]?.name ?? "Unsorted";
}
export function lifeAreaColor(id: string, lifeAreas?: LifeArea[]): string {
  return lifeAreaMap(lifeAreas)[id]?.color ?? NEUTRAL;
}
export function projectName(id: string | null): string {
  return activeProjectName(id);
}
export function projectWhy(id: string | null): string | null {
  return activeProjectWhy(id);
}
export function workModeName(id: string | null): string {
  if (!id) return "No mode";
  return getActiveWorkModes().find((m) => m.id === id)?.name ?? "No mode";
}

function effectiveWhen(t: Task, weekStartsOn: WeekStartDay): number | null {
  const planKey = doPlanSortKey(t.doPlan, weekStartsOn);
  if (planKey !== null) return planKey;
  return t.deadlineInDays;
}

function sortTasks(a: Task, b: Task, weekStartsOn: WeekStartDay): number {
  const ea = effectiveWhen(a, weekStartsOn);
  const eb = effectiveWhen(b, weekStartsOn);
  if (ea === null && eb === null) return 0;
  if (ea === null) return 1;
  if (eb === null) return -1;
  return ea - eb;
}

function buildGroup(
  key: string,
  label: string,
  tasks: Task[],
  weekStartsOn: WeekStartDay,
  color?: string
): TaskGroup {
  return {
    key,
    label,
    color,
    tasks: [...tasks].sort((a, b) => sortTasks(a, b, weekStartsOn)),
  };
}

function activeLot(tasks: Task[]): Task[] {
  // Include Today-bench tasks so the Lot is a full active map (Today is a focus, not a hide).
  return tasks.filter((t) => t.status !== "done" && !isWaitingTask(t));
}

function groupByWaiting(lot: Task[], weekStartsOn: WeekStartDay): TaskGroup[] {
  const items = waitingTasks(lot);
  if (items.length === 0) return [];
  return [buildGroup("waiting", "Waiting on others", items, weekStartsOn)];
}

function groupByWhen(lot: Task[], weekStartsOn: WeekStartDay): TaskGroup[] {
  const { start: weekStart, end: weekEnd } = weekRange(weekStartsOn, 0);

  const buckets: {
    key: string;
    label: string;
    color: string;
    test: (t: Task) => boolean;
  }[] = [
    {
      key: "today",
      label: "Today",
      color: "#5b61e8",
      test: (t) => {
        const e = effectiveWhen(t, weekStartsOn);
        return e !== null && e <= 0;
      },
    },
    {
      key: "week",
      label: "This week",
      color: "#3c8262",
      test: (t) => {
        if (t.doPlan?.kind === "week") {
          const key = doPlanSortKey(t.doPlan, weekStartsOn);
          return key !== null && key >= weekStart && key <= weekEnd;
        }
        const e = effectiveWhen(t, weekStartsOn);
        return e !== null && e >= Math.max(1, weekStart) && e <= weekEnd;
      },
    },
    {
      key: "later",
      label: "Later",
      color: "#3d6f9f",
      test: (t) => {
        const e = effectiveWhen(t, weekStartsOn);
        if (e === null) return false;
        return e > weekEnd;
      },
    },
    {
      key: "someday",
      label: "Someday",
      color: NEUTRAL,
      test: (t) => effectiveWhen(t, weekStartsOn) === null,
    },
  ];

  return buckets
    .map((b) =>
      buildGroup(b.key, b.label, lot.filter((t) => b.test(t)), weekStartsOn, b.color)
    )
    .filter((g) => g.tasks.length > 0);
}

export function groupTasks(
  tasks: Task[],
  lens: LensId,
  weekStartsOn: WeekStartDay = 0,
  lifeAreas?: LifeArea[]
): TaskGroup[] {
  if (lens === "waiting") return groupByWaiting(tasks, weekStartsOn);

  if (lens === "when") return groupByWhen(activeLot(tasks), weekStartsOn);

  // Area/project are organizational reference views — Today-bench tasks
  // still belong in their column, unlike the "when"/"mode" work-bench lenses.
  if (lens === "area") {
    const lot = activeLot(tasks);
    const areas = resolveLifeAreas(lifeAreas);
    const areaMap = lifeAreaMap(lifeAreas);
    const known = areas.map((a) =>
      buildGroup(
        a.id,
        a.name,
        lot.filter((t) => t.lifeAreaId === a.id),
        weekStartsOn,
        a.color
      )
    );
    const unsorted = buildGroup(
      "unsorted",
      "Unsorted",
      lot.filter((t) => !areaMap[t.lifeAreaId]),
      weekStartsOn,
      NEUTRAL
    );
    // Areas the user defined stay visible even when empty — a column vanishing
    // because you cleared it reads as the app losing your structure. "Unsorted"
    // is derived rather than declared, so it only appears when it has contents.
    return unsorted.tasks.length > 0 ? [...known, unsorted] : known;
  }

  if (lens === "project") {
    const lot = activeLot(tasks);
    const projects = getActiveProjects().map((p) =>
      buildGroup(
        p.id,
        p.name,
        lot.filter((t) => t.projectId === p.id),
        weekStartsOn,
        lifeAreaColor(p.lifeAreaId, lifeAreas)
      )
    );
    const loose = buildGroup(
      "no-project",
      "No project",
      lot.filter((t) => t.projectId === null),
      weekStartsOn,
      NEUTRAL
    );
    return [...projects, loose].filter((g) => g.key === "no-project" ? g.tasks.length > 0 : true);
  }

  const lot = activeLot(tasks);
  const modes = getActiveWorkModes().map((m) =>
    buildGroup(m.id, m.name, lot.filter((t) => t.workModeId === m.id), weekStartsOn)
  );
  const none = buildGroup(
    "no-mode",
    "No mode",
    lot.filter((t) => t.workModeId === null),
    weekStartsOn,
    NEUTRAL
  );
  return [...modes, none].filter((g) => g.tasks.length > 0);
}

export function isUnsorted(task: Task, lifeAreas?: LifeArea[]): boolean {
  return !lifeAreaMap(lifeAreas)[task.lifeAreaId];
}

export function isInboxTask(task: Task, lifeAreas?: LifeArea[]): boolean {
  return (
    task.status !== "done" &&
    !task.inToday &&
    !isWaitingTask(task) &&
    isUnsorted(task, lifeAreas) &&
    task.projectId === null &&
    task.doPlan === null &&
    task.deadlineInDays === null
  );
}

export function deadlineTasks(tasks: Task[]): Task[] {
  return tasks
    .filter((t) => t.status !== "done" && t.deadlineInDays !== null)
    .sort((a, b) => (a.deadlineInDays ?? 0) - (b.deadlineInDays ?? 0));
}

export function groupDeadlines(tasks: Task[]): TaskGroup[] {
  const items = deadlineTasks(tasks);
  const buckets: { key: string; label: string; test: (d: number) => boolean }[] = [
    { key: "overdue", label: "Overdue", test: (d) => d < 0 },
    { key: "today", label: "Today", test: (d) => d === 0 },
    { key: "week", label: "This week", test: (d) => d >= 1 && d <= 7 },
    { key: "month", label: "This month", test: (d) => d >= 8 && d <= 30 },
    { key: "later", label: "Later", test: (d) => d > 30 },
  ];
  return buckets
    .map((b) =>
      buildGroup(
        b.key,
        b.label,
        items.filter((t) => b.test(t.deadlineInDays!)),
        0
      )
    )
    .filter((g) => g.tasks.length > 0);
}

export function searchTasks(tasks: Task[], query: string, weekStartsOn: WeekStartDay = 0): Task[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return tasks
    .filter((t) => t.title.toLowerCase().includes(q))
    .sort((a, b) => sortTasks(a, b, weekStartsOn));
}

export function planLabel(plan: DoPlan, weekStartsOn: WeekStartDay = 0): string | null {
  if (plan === null) return null;
  const label = doPlanLabel(plan, weekStartsOn);
  if (label === "Doing") return null;
  if (label === "Today") return "today";
  if (label === "Tomorrow") return "tomorrow";
  if (label === "Yesterday") return "yesterday";
  if (label === "This week") return "this week";
  return label.toLowerCase();
}

export function isCarriedTask(task: Task, weekStartsOn: WeekStartDay): boolean {
  return isCarriedDoPlan(task.doPlan, weekStartsOn);
}

export type DeadlineTone = "danger" | "muted";

export function deadlineLabel(
  deadlineInDays: number | null
): { text: string; tone: DeadlineTone } | null {
  if (deadlineInDays === null) return null;
  const text = formatDeadlineDisplay(deadlineInDays);
  if (deadlineInDays < 0) return { text, tone: "danger" };
  if (deadlineInDays === 0) return { text, tone: "danger" };
  if (deadlineInDays <= 3) return { text, tone: "danger" };
  return { text, tone: "muted" };
}

export { formatDeadlineDisplay };
