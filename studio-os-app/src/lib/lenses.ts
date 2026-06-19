import type { Task, LensId, TaskGroup } from "./types";
import { LIFE_AREAS, PROJECTS, WORK_MODES } from "./sample-data";

const NEUTRAL = "#8b95a1";

const areaById = Object.fromEntries(LIFE_AREAS.map((a) => [a.id, a]));
const projectById = Object.fromEntries(PROJECTS.map((p) => [p.id, p]));
const modeById = Object.fromEntries(WORK_MODES.map((m) => [m.id, m]));

export function lifeAreaName(id: string): string {
  return areaById[id]?.name ?? "Unsorted";
}
export function lifeAreaColor(id: string): string {
  return areaById[id]?.color ?? NEUTRAL;
}
export function projectName(id: string | null): string {
  return id ? projectById[id]?.name ?? id : "No project";
}
export function workModeName(id: string | null): string {
  return id ? modeById[id]?.name ?? id : "No mode";
}

/** When you'll actually engage: your plan, or — if none — the external deadline. */
function effectiveWhen(t: Task): number | null {
  return t.doDateInDays ?? t.deadlineInDays;
}

function sortTasks(a: Task, b: Task): number {
  const ea = effectiveWhen(a);
  const eb = effectiveWhen(b);
  if (ea === null && eb === null) return 0;
  if (ea === null) return 1;
  if (eb === null) return -1;
  return ea - eb;
}

function buildGroup(key: string, label: string, tasks: Task[], color?: string): TaskGroup {
  return { key, label, color, tasks: [...tasks].sort(sortTasks) };
}

/** Active tasks that aren't already in Today — "the Lot" is everything else. */
function activeLot(tasks: Task[]): Task[] {
  return tasks.filter((t) => t.status !== "done" && !t.inToday);
}

function groupByWhen(lot: Task[]): TaskGroup[] {
  // No "overdue" bucket on purpose: a past doing date is just "carried" → folds
  // calmly into Today. The app refuses to manufacture overdue anxiety.
  const buckets: { key: string; label: string; color: string; test: (e: number | null) => boolean }[] = [
    { key: "today", label: "Today", color: "#5b61e8", test: (e) => e !== null && e <= 0 },
    { key: "week", label: "This week", color: "#3c8262", test: (e) => e !== null && e >= 1 && e <= 7 },
    { key: "later", label: "Later", color: "#3d6f9f", test: (e) => e !== null && e > 7 },
    { key: "someday", label: "Someday", color: NEUTRAL, test: (e) => e === null },
  ];
  return buckets
    .map((b) => buildGroup(b.key, b.label, lot.filter((t) => b.test(effectiveWhen(t))), b.color))
    .filter((g) => g.tasks.length > 0);
}

export function groupTasks(tasks: Task[], lens: LensId): TaskGroup[] {
  const lot = activeLot(tasks);

  if (lens === "when") return groupByWhen(lot);

  if (lens === "area") {
    const known = LIFE_AREAS.map((a) =>
      buildGroup(a.id, a.name, lot.filter((t) => t.lifeAreaId === a.id), a.color)
    );
    // Fresh captures have no area yet — keep them visible, never dropped.
    const unsorted = buildGroup(
      "unsorted",
      "Unsorted",
      lot.filter((t) => !areaById[t.lifeAreaId]),
      NEUTRAL
    );
    return [...known, unsorted].filter((g) => g.tasks.length > 0);
  }

  if (lens === "project") {
    const projects = PROJECTS.map((p) =>
      buildGroup(p.id, p.name, lot.filter((t) => t.projectId === p.id), lifeAreaColor(p.lifeAreaId))
    );
    const loose = buildGroup("no-project", "No project", lot.filter((t) => t.projectId === null), NEUTRAL);
    return [...projects, loose].filter((g) => g.tasks.length > 0);
  }

  // mode
  const modes = WORK_MODES.map((m) =>
    buildGroup(m.id, m.name, lot.filter((t) => t.workModeId === m.id))
  );
  const none = buildGroup("no-mode", "No mode", lot.filter((t) => t.workModeId === null), NEUTRAL);
  return [...modes, none].filter((g) => g.tasks.length > 0);
}

/** Global search spans EVERYTHING — active, in-Today, and done. */
export function searchTasks(tasks: Task[], query: string): Task[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return tasks.filter((t) => t.title.toLowerCase().includes(q)).sort(sortTasks);
}

/** Soft plan-to-do label. Past plans read as "carried", never "overdue". */
export function planLabel(doDateInDays: number | null): string | null {
  if (doDateInDays === null) return null;
  if (doDateInDays < 0) return "carried";
  if (doDateInDays === 0) return "today";
  if (doDateInDays === 1) return "tomorrow";
  return `in ${doDateInDays}d`;
}

export type DeadlineTone = "danger" | "muted";

/** Hard external deadline — the only thing allowed to apply gentle pressure. */
export function deadlineLabel(
  deadlineInDays: number | null
): { text: string; tone: DeadlineTone } | null {
  if (deadlineInDays === null) return null;
  if (deadlineInDays < 0) return { text: "deadline passed", tone: "danger" };
  if (deadlineInDays === 0) return { text: "due today", tone: "danger" };
  if (deadlineInDays <= 3) return { text: `due in ${deadlineInDays}d`, tone: "danger" };
  return { text: `due in ${deadlineInDays}d`, tone: "muted" };
}
