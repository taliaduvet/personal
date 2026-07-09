import type { Task } from "@/lib/types";
import {
  buildEventIds,
  dateKeyFromOffset,
  doingDayFromPlan,
  parseEventIds,
  type ParsedEventIds,
} from "./event-ids";
import { mapSheetDoPlan } from "@/lib/sheet/map";
import type { WeekStartDay } from "@/lib/week";

const CAL_API = "https://www.googleapis.com/calendar/v3";
export const CALENDAR_WRITE_SCOPE = "https://www.googleapis.com/auth/calendar";

type GEvent = {
  id?: string;
  summary?: string;
  start?: { date?: string; dateTime?: string; timeZone?: string };
  end?: { date?: string; dateTime?: string; timeZone?: string };
};

async function calFetch<T>(
  url: string,
  token: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Calendar API (${res.status}): ${text.slice(0, 200)}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function findStudioCalendarId(
  token: string,
  name = "Studio OS"
): Promise<string | null> {
  const data = await calFetch<{ items?: { id: string; summary?: string }[] }>(
    `${CAL_API}/users/me/calendarList`,
    token
  );
  const match = (data.items ?? []).find((c) => c.summary === name);
  return match?.id ?? null;
}

export async function getOrCreateStudioCalendarId(
  token: string,
  name = "Studio OS",
  timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
): Promise<string> {
  const existing = await findStudioCalendarId(token, name);
  if (existing) return existing;

  const created = await calFetch<{ id: string }>(`${CAL_API}/calendars`, token, {
    method: "POST",
    body: JSON.stringify({
      summary: name,
      description: "Tasks & deadlines from Studio OS",
      timeZone,
    }),
  });
  return created.id;
}

async function getEvent(token: string, calId: string, eventId: string): Promise<GEvent | null> {
  try {
    return await calFetch<GEvent>(
      `${CAL_API}/calendars/${encodeURIComponent(calId)}/events/${encodeURIComponent(eventId)}`,
      token
    );
  } catch {
    return null;
  }
}

async function deleteEvent(token: string, calId: string, eventId: string) {
  try {
    await calFetch(
      `${CAL_API}/calendars/${encodeURIComponent(calId)}/events/${encodeURIComponent(eventId)}`,
      token,
      { method: "DELETE" }
    );
  } catch {
    /* already gone */
  }
}

async function upsertAllDay(
  token: string,
  calId: string,
  eventId: string | null,
  title: string,
  dateKey: string
): Promise<string> {
  const body = {
    summary: title,
    start: { date: dateKey },
    end: { date: dateKey },
  };

  if (eventId) {
    const existing = await getEvent(token, calId, eventId);
    if (existing?.id) {
      const updated = await calFetch<GEvent>(
        `${CAL_API}/calendars/${encodeURIComponent(calId)}/events/${encodeURIComponent(eventId)}`,
        token,
        { method: "PUT", body: JSON.stringify({ ...existing, ...body }) }
      );
      return updated.id!;
    }
  }

  const created = await calFetch<GEvent>(
    `${CAL_API}/calendars/${encodeURIComponent(calId)}/events`,
    token,
    { method: "POST", body: JSON.stringify(body) }
  );
  return created.id!;
}

async function upsertTimed(
  token: string,
  calId: string,
  eventId: string | null,
  title: string,
  start: Date,
  end: Date
): Promise<string> {
  const body = {
    summary: title,
    start: { dateTime: start.toISOString() },
    end: { dateTime: end.toISOString() },
  };

  if (eventId) {
    const existing = await getEvent(token, calId, eventId);
    if (existing?.id) {
      const updated = await calFetch<GEvent>(
        `${CAL_API}/calendars/${encodeURIComponent(calId)}/events/${encodeURIComponent(eventId)}`,
        token,
        { method: "PUT", body: JSON.stringify({ ...existing, ...body }) }
      );
      return updated.id!;
    }
  }

  const created = await calFetch<GEvent>(
    `${CAL_API}/calendars/${encodeURIComponent(calId)}/events`,
    token,
    { method: "POST", body: JSON.stringify(body) }
  );
  return created.id!;
}

function doingDayShortFromTask(task: Task, weekStartsOn: WeekStartDay): string {
  const plan = task.doPlan;
  if (plan?.kind === "day") {
    const d = new Date();
    d.setDate(d.getDate() + plan.offset);
    return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()];
  }
  if (plan?.kind === "week") {
    const mapped = mapSheetDoPlan("", `${plan.weekStart}T12:00:00`, weekStartsOn);
    if (mapped?.kind === "day") {
      const d = new Date();
      d.setDate(d.getDate() + mapped.offset);
      return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()];
    }
  }
  return "";
}

export type CalendarSyncResult = {
  eventId: string;
  calendarId: string;
};

/** Sync one task's deadline + doing events to the Studio OS calendar. */
export async function syncTaskCalendarEvents(
  token: string,
  task: Task,
  weekStartsOn: WeekStartDay,
  calendarId?: string | null
): Promise<CalendarSyncResult | null> {
  if (!task.title.trim()) return null;

  const calId = calendarId ?? (await getOrCreateStudioCalendarId(token));
  const ids: ParsedEventIds = parseEventIds(task.sheetMeta?.eventId);

  if (task.status === "done") {
    if (ids.deadline) await deleteEvent(token, calId, ids.deadline);
    if (ids.doing) await deleteEvent(token, calId, ids.doing);
    return { eventId: "", calendarId: calId };
  }

  if (task.deadlineInDays != null) {
    const dateKey = dateKeyFromOffset(task.deadlineInDays);
    ids.deadline = await upsertAllDay(token, calId, ids.deadline, task.title, dateKey);
  } else if (ids.deadline) {
    await deleteEvent(token, calId, ids.deadline);
    ids.deadline = null;
  }

  const doingDay = doingDayShortFromTask(task, weekStartsOn);
  if (doingDay) {
    const block = doingDayFromPlan(doingDay, 9, 0);
    if (block) {
      ids.doing = await upsertTimed(token, calId, ids.doing, task.title, block.start, block.end);
    }
  } else if (ids.doing) {
    await deleteEvent(token, calId, ids.doing);
    ids.doing = null;
  }

  return { eventId: buildEventIds(ids), calendarId: calId };
}

export async function ensureWeeklyReviewEvent(
  token: string,
  calendarId: string,
  dayName = "Mon",
  time = "09:00",
  existingSeriesId?: string | null
): Promise<string | null> {
  if (existingSeriesId) {
    const ev = await getEvent(token, calendarId, existingSeriesId);
    if (ev?.id) return existingSeriesId;
  }

  const [hh, mm] = time.split(":").map((x) => parseInt(x, 10));
  const block = doingDayFromPlan(dayName, hh || 9, mm || 0);
  if (!block) return null;

  const weekdayMap: Record<string, string> = {
    Sun: "SU",
    Mon: "MO",
    Tue: "TU",
    Wed: "WE",
    Thu: "TH",
    Fri: "FR",
    Sat: "SA",
  };
  const byday = weekdayMap[dayName] ?? "MO";

  // Google requires an explicit timeZone on recurring events.
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const created = await calFetch<GEvent>(
    `${CAL_API}/calendars/${encodeURIComponent(calendarId)}/events`,
    token,
    {
      method: "POST",
      body: JSON.stringify({
        summary: "Weekly Review — Studio OS",
        start: { dateTime: block.start.toISOString(), timeZone },
        end: {
          dateTime: new Date(block.start.getTime() + 30 * 60 * 1000).toISOString(),
          timeZone,
        },
        recurrence: [`RRULE:FREQ=WEEKLY;BYDAY=${byday}`],
      }),
    }
  );
  return created.id ?? null;
}
