import type { Task, LensId, TaskGroup, DoPlan } from "./types";
import type { WeekStartDay } from "./week";
import { WORK_MODES } from "./sample-data";
import { activeLifeAreaById, getActiveLifeAreas } from "./life-area-registry";
import { activeProjectName, activeProjectWhy, getActiveProjects } from "./project-registry";
import { doPlanLabel, doPlanSortKey, isCarriedDoPlan } from "./do-plan";
import { weekRange } from "./week";

const NEUTRAL = "#8b95a1";
const modeById = Object.fromEntries(WORK_MODES.map((m) => [m.id, m]));

export function lifeAreaName(id: string): string {
  return activeLifeAreaById()[id]?.name ?? "Unsorted";
}
export function lifeAreaColor(id: string): string {
  return activeLifeAreaById()[id]?.color ?? NEUTRAL;
}
export function projectName(id: string | null): string {
  return activeProjectName(id);
}
export function projectWhy(id: string | null): string | null {
  return activeProjectWhy(id);
}
export function workModeName(id: string | null): string {
  return id ? modeById[id]?.name ?? id : "No mode";
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
  return tasks.filter((t) => t.status !== "done" && !t.inToday);
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

export function groupTasks(tasks: Task[], lens: LensId, weekStartsOn: WeekStartDay = 0): TaskGroup[] {
  const lot = activeLot(tasks);

  if (lens === "when") return groupByWhen(lot, weekStartsOn);

  if (lens === "area") {
    const areas = getActiveLifeAreas();
    const areaMap = activeLifeAreaById();
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
    return [...known, unsorted].filter((g) => g.tasks.length > 0);
  }

  if (lens === "project") {
    const projects = getActiveProjects().map((p) =>
      buildGroup(
        p.id,
        p.name,
        lot.filter((t) => t.projectId === p.id),
        weekStartsOn,
        lifeAreaColor(p.lifeAreaId)
      )
    );
    const loose = buildGroup(
      "no-project",
      "No project",
      lot.filter((t) => t.projectId === null),
      weekStartsOn,
      NEUTRAL
    );
    return [...projects, loose].filter((g) => g.tasks.length > 0);
  }

  const modes = WORK_MODES.map((m) =>
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

export function isUnsorted(task: Task): boolean {
  return !activeLifeAreaById()[task.lifeAreaId];
}

export function isInboxTask(task: Task): boolean {
  return (
    task.status !== "done" &&
    !task.inToday &&
    isUnsorted(task) &&
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
    { key: "today", label: "Today", test: (d) => d <= 0 },
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
  if (deadlineInDays < 0) return { text: "overdue", tone: "danger" };
  if (deadlineInDays === 0) return { text: "due today", tone: "danger" };
  if (deadlineInDays <= 3) return { text: `due in ${deadlineInDays}d`, tone: "danger" };
  return { text: `due in ${deadlineInDays}d`, tone: "muted" };
}
