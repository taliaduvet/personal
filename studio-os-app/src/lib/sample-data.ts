import type { LifeArea, Project, WorkMode, Task } from "./types";

/**
 * Stand-in data so the lens model is usable before the live Sheet is wired.
 * Dates are stored as day-offsets from "today" so the When lens always looks
 * alive regardless of when it's opened (and avoids server/client date drift).
 */

export const LIFE_AREAS: LifeArea[] = [
  { id: "music", name: "Music", color: "#5b61e8" },
  { id: "income", name: "Income", color: "#3c8262" },
  { id: "health", name: "Health", color: "#bc6740" },
  { id: "people", name: "People", color: "#6a5dc0" },
  { id: "home", name: "Home & Admin", color: "#3d6f9f" },
];

export const PROJECTS: Project[] = [
  { id: "spring-ep", name: "Spring EP", lifeAreaId: "music", why: "Put the body of work I'm proudest of into the world." },
  { id: "fall-tour", name: "Fall Tour", lifeAreaId: "music", why: "Play these songs live and meet the people who listen." },
  { id: "factor-grant", name: "FACTOR Grant", lifeAreaId: "music", why: "Fund the next record without going into debt." },
  { id: "day-job", name: "Day Job", lifeAreaId: "income", why: "Keep the lights on so the music doesn't have to pay rent yet." },
  { id: "apartment", name: "Cheaper apartment", lifeAreaId: "home", why: "Lower my overhead so I can take more creative risks." },
];

export const WORK_MODES: WorkMode[] = [
  { id: "admin", name: "Admin" },
  { id: "creative", name: "Creative" },
  { id: "outreach", name: "Outreach" },
  { id: "errands", name: "Errands" },
];

// Most tasks carry only a soft doing date. Hard deadlines are rare and external.
const TASK_SEED = [
  // Music · Spring EP
  { id: "t1", title: "Master 'Lowlight' (final mix)", lifeAreaId: "music", projectId: "spring-ep", workModeId: "creative", doDateInDays: 2, deadlineInDays: null, status: "in_progress", inToday: true },
  { id: "t2", title: "Approve single artwork", lifeAreaId: "music", projectId: "spring-ep", workModeId: "creative", doDateInDays: 5, deadlineInDays: null, status: "todo", inToday: false },
  { id: "t3", title: "Schedule DistroKid upload", lifeAreaId: "music", projectId: "spring-ep", workModeId: "admin", doDateInDays: 9, deadlineInDays: null, status: "todo", inToday: false },

  // Music · Fall Tour
  { id: "t4", title: "Email 3 venues about October dates", lifeAreaId: "music", projectId: "fall-tour", workModeId: "outreach", doDateInDays: -1, deadlineInDays: null, status: "todo", inToday: false },
  { id: "t5", title: "Draft tour budget", lifeAreaId: "music", projectId: "fall-tour", workModeId: "admin", doDateInDays: 4, deadlineInDays: null, status: "todo", inToday: false },

  // Music · FACTOR Grant (real external deadline)
  { id: "t6", title: "Finish grant narrative", lifeAreaId: "music", projectId: "factor-grant", workModeId: "creative", doDateInDays: 0, deadlineInDays: 1, status: "in_progress", inToday: true, notes: "Need to mention the community workshop series and touring plan. Budget section is mostly done.", subtasks: [
    { id: "s1", title: "Draft opening paragraph", done: true },
    { id: "s2", title: "Write budget justification", done: false },
    { id: "s3", title: "Get a second pair of eyes on it", done: false },
  ] },
  { id: "t7", title: "Gather expense receipts", lifeAreaId: "music", projectId: "factor-grant", workModeId: "admin", doDateInDays: 6, deadlineInDays: null, status: "todo", inToday: false },

  // Income · Day Job (external deadline)
  { id: "t8", title: "Submit weekly timesheet", lifeAreaId: "income", projectId: "day-job", workModeId: "admin", doDateInDays: null, deadlineInDays: 0, status: "todo", inToday: true },
  { id: "t9", title: "Reply to manager's email", lifeAreaId: "income", projectId: "day-job", workModeId: "outreach", doDateInDays: -2, deadlineInDays: null, status: "todo", inToday: false },

  // Health · loose
  { id: "t10", title: "Book dentist appointment", lifeAreaId: "health", projectId: null, workModeId: "errands", doDateInDays: null, deadlineInDays: null, status: "todo", inToday: false },
  { id: "t11", title: "Refill prescription", lifeAreaId: "health", projectId: null, workModeId: "errands", doDateInDays: 3, deadlineInDays: null, status: "todo", inToday: false },

  // People · loose
  { id: "t12", title: "Call mom", lifeAreaId: "people", projectId: null, workModeId: "outreach", doDateInDays: null, deadlineInDays: null, status: "todo", inToday: false },
  { id: "t13", title: "Reply to Sam about the collab", lifeAreaId: "people", projectId: null, workModeId: "outreach", doDateInDays: 2, deadlineInDays: null, status: "todo", inToday: false },

  // Home & Admin
  { id: "t14", title: "Tour two apartment listings", lifeAreaId: "home", projectId: "apartment", workModeId: "errands", doDateInDays: 7, deadlineInDays: null, status: "todo", inToday: false },
  { id: "t15", title: "Cancel unused subscription", lifeAreaId: "home", projectId: null, workModeId: "admin", doDateInDays: null, deadlineInDays: null, status: "todo", inToday: false },

  // Fresh captures — truly unsorted (no area, project, or plan yet). These are
  // what the Inbox is for: untriaged thoughts waiting for a home.
  { id: "t16", title: "Idea: lyric video for the single", lifeAreaId: "", projectId: null, workModeId: null, doDateInDays: null, deadlineInDays: null, status: "todo", inToday: false },
  { id: "t17", title: "Look into sync licensing", lifeAreaId: "", projectId: null, workModeId: null, doDateInDays: null, deadlineInDays: null, status: "todo", inToday: false },

  // Already done (excluded from the Lot, still findable in search)
  { id: "t18", title: "Pay June rent", lifeAreaId: "home", projectId: null, workModeId: "admin", doDateInDays: null, deadlineInDays: -5, status: "done", inToday: false },
  { id: "t19", title: "Post release announcement", lifeAreaId: "music", projectId: "spring-ep", workModeId: "outreach", doDateInDays: -3, deadlineInDays: null, status: "done", inToday: false },
];

export const TASKS: Task[] = TASK_SEED.map(
  (t) =>
    ({
      notes: "",
      subtasks: [],
      ...t,
    }) as Task
);
