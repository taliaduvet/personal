export type ParsedEventIds = {
  deadline: string | null;
  doing: string | null;
};

const DEADLINE_TAG = "deadline";
const DOING_TAG = "doing";

/** Parse Tasks column L: "deadline:ID|doing:ID" */
export function parseEventIds(raw: string | null | undefined): ParsedEventIds {
  const res: ParsedEventIds = { deadline: null, doing: null };
  if (!raw?.trim()) return res;

  for (const part of raw.split("|")) {
    const idx = part.indexOf(":");
    if (idx <= 0) continue;
    const tag = part.slice(0, idx);
    const id = part.slice(idx + 1).trim();
    if (!id) continue;
    if (tag === DEADLINE_TAG) res.deadline = id;
    else if (tag === DOING_TAG) res.doing = id;
  }
  return res;
}

export function buildEventIds(ids: ParsedEventIds): string {
  const parts: string[] = [];
  if (ids.deadline) parts.push(`${DEADLINE_TAG}:${ids.deadline}`);
  if (ids.doing) parts.push(`${DOING_TAG}:${ids.doing}`);
  return parts.join("|");
}

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/** Next occurrence of weekday at hh:mm local (matches CalendarSync.gs). */
export function nextWeekdayAt(
  dayName: string,
  hh: number,
  mm: number,
  from = new Date()
): Date | null {
  const target = WEEKDAY_INDEX[dayName.trim()];
  if (target === undefined) return null;
  const now = new Date(from);
  const diff = (target - now.getDay() + 7) % 7;
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff, hh, mm, 0);
}

export function doingDayFromPlan(
  doingDay: string,
  hh = 9,
  mm = 0
): { start: Date; end: Date } | null {
  const start = nextWeekdayAt(doingDay, hh, mm);
  if (!start) return null;
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  return { start, end };
}

export function dateKeyFromOffset(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(0, 0, 0, 0);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
