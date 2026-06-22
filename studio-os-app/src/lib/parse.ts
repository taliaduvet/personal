import { PROJECTS, WORK_MODES } from "./sample-data";

export type ParseResult = {
  title: string;
  projectId: string | null;
  lifeAreaId: string;
  workModeId: string | null;
  doDateInDays: number | null;
  deadlineInDays: number | null;
};

/** Project aliases longest-first so "factor grant" beats "factor". */
const PROJECT_ALIASES: [string, string][] = [
  ["factor grant", "factor-grant"],
  ["spring ep", "spring-ep"],
  ["fall tour", "fall-tour"],
  ["day job", "day-job"],
  ["cheaper apartment", "apartment"],
  ["factor", "factor-grant"],
  ["apartment", "apartment"],
];

const MODE_PREFIX = /^(admin|creative|outreach|errands)\s*:\s*/i;

const MODE_WORDS: [RegExp, string][] = [
  [/\b(email|outreach|venues?)\b/i, "outreach"],
  [/\b(creative|mix|master|write|draft)\b/i, "creative"],
  [/\b(admin|timesheet|invoice|budget)\b/i, "admin"],
  [/\b(errand|appointment|dentist|prescription)\b/i, "errands"],
];

function daysUntilWeekday(target: number): number {
  const today = new Date().getDay();
  let diff = target - today;
  if (diff <= 0) diff += 7;
  return diff;
}

function stripPattern(text: string, pattern: RegExp): string {
  return text.replace(pattern, " ").replace(/\s+/g, " ").trim();
}

/**
 * Parse natural-language hints from a capture title.
 * Applies suggestions the user confirms in Quick Edit — never blocks capture.
 */
export function parseTaskTitle(raw: string): ParseResult {
  let title = raw.trim();
  let projectId: string | null = null;
  let workModeId: string | null = null;
  let doDateInDays: number | null = null;
  let deadlineInDays: number | null = null;

  // Mode prefix: "creative: draft chorus"
  const prefix = title.match(MODE_PREFIX);
  if (prefix) {
    workModeId = prefix[1].toLowerCase();
    title = title.slice(prefix[0].length).trim();
  }

  // Hard deadline phrases (checked before soft doing dates)
  const deadlinePatterns: [RegExp, number][] = [
    [/\b(due|by)\s+today\b/i, 0],
    [/\b(due|by)\s+tomorrow\b/i, 1],
    [/\b(due|by)\s+friday\b/i, daysUntilWeekday(5)],
    [/\b(due|by)\s+monday\b/i, daysUntilWeekday(1)],
    [/\b(due|by)\s+tuesday\b/i, daysUntilWeekday(2)],
    [/\b(due|by)\s+wednesday\b/i, daysUntilWeekday(3)],
    [/\b(due|by)\s+thursday\b/i, daysUntilWeekday(4)],
    [/\b(due|by)\s+saturday\b/i, daysUntilWeekday(6)],
    [/\b(due|by)\s+sunday\b/i, daysUntilWeekday(0)],
    [/\bdue in (\d+) days?\b/i, -1], // special: capture group
  ];

  for (const [re, days] of deadlinePatterns) {
    const m = title.match(re);
    if (m) {
      deadlineInDays = days === -1 ? parseInt(m[1], 10) : days;
      title = stripPattern(title, re);
      break;
    }
  }

  // Soft doing dates (only if no deadline phrase consumed "tomorrow/today")
  if (doDateInDays === null && deadlineInDays === null) {
    if (/\btoday\b/i.test(title)) {
      doDateInDays = 0;
      title = stripPattern(title, /\btoday\b/i);
    } else if (/\btomorrow\b/i.test(title)) {
      doDateInDays = 1;
      title = stripPattern(title, /\btomorrow\b/i);
    } else if (/\bnext week\b/i.test(title)) {
      doDateInDays = 7;
      title = stripPattern(title, /\bnext week\b/i);
    } else {
      const inDays = title.match(/\bin (\d+) days?\b/i);
      if (inDays) {
        doDateInDays = parseInt(inDays[1], 10);
        title = stripPattern(title, /\bin \d+ days?\b/i);
      }
    }
  }

  // Project aliases
  const lower = title.toLowerCase();
  for (const [alias, id] of PROJECT_ALIASES) {
    if (lower.includes(alias)) {
      projectId = id;
      title = stripPattern(title, new RegExp(alias, "i"));
      break;
    }
  }

  // Mode from keywords if not set by prefix
  if (!workModeId) {
    for (const [re, id] of MODE_WORDS) {
      if (re.test(title)) {
        workModeId = id;
        break;
      }
    }
  }

  const project = projectId ? PROJECTS.find((p) => p.id === projectId) : null;
  const lifeAreaId = project?.lifeAreaId ?? "";

  // Validate mode id exists
  if (workModeId && !WORK_MODES.some((m) => m.id === workModeId)) {
    workModeId = null;
  }

  return {
    title: title || raw.trim(),
    projectId,
    lifeAreaId,
    workModeId,
    doDateInDays,
    deadlineInDays,
  };
}

/** Human labels for classify chips in Quick Edit / Work View context row. */
export function classifyChipLabels(task: {
  projectId: string | null;
  doDateInDays: number | null;
  deadlineInDays: number | null;
  workModeId: string | null;
}): { project?: string; doing?: string; deadline?: string; mode?: string } {
  const chips: ReturnType<typeof classifyChipLabels> = {};
  if (task.projectId) {
    const p = PROJECTS.find((x) => x.id === task.projectId);
    if (p) chips.project = p.name;
  }
  if (task.doDateInDays !== null) {
    if (task.doDateInDays < 0) chips.doing = "Carried";
    else if (task.doDateInDays === 0) chips.doing = "Today";
    else if (task.doDateInDays === 1) chips.doing = "Tomorrow";
    else if (task.doDateInDays <= 7) chips.doing = `In ${task.doDateInDays}d`;
    else chips.doing = `In ~${Math.round(task.doDateInDays / 7)}w`;
  }
  if (task.deadlineInDays !== null) {
    if (task.deadlineInDays < 0) chips.deadline = "Deadline passed";
    else if (task.deadlineInDays === 0) chips.deadline = "Due today";
    else if (task.deadlineInDays === 1) chips.deadline = "Due tomorrow";
    else chips.deadline = `Due in ${task.deadlineInDays}d`;
  }
  if (task.workModeId) {
    const m = WORK_MODES.find((x) => x.id === task.workModeId);
    if (m) chips.mode = m.name;
  }
  return chips;
}
