/** 0 = Sunday … 6 = Saturday */
export type WeekStartDay = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const WEEK_START_OPTIONS: { value: WeekStartDay; label: string }[] = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

export type WeekRange = {
  /** Day offset from today for the first day of the week. */
  start: number;
  /** Day offset from today for the last day of the week. */
  end: number;
  label: string;
  /** ISO date (YYYY-MM-DD) of the week-start day. */
  weekStartKey: string;
};

function dateWithOffset(offset: number, now: Date = new Date()): Date {
  const d = new Date(now);
  d.setDate(d.getDate() + offset);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Local calendar date — deliberately not `toISOString()`, which converts to UTC
 * and would report the previous day for any timezone east of Greenwich.
 */
function isoDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Configurable week window. weekOffset 0 = this week, -1 = last week, 1 = next week.
 *
 * `now` is injectable so callers that already reason about a fixed instant
 * (the trust core, tests) get a week boundary that agrees with it. Defaulting
 * to the real clock keeps every existing caller unchanged.
 */
export function weekRange(
  weekStartsOn: WeekStartDay,
  weekOffset = 0,
  now: Date = new Date()
): WeekRange {
  const today = now.getDay() as WeekStartDay;
  const daysSinceStart = (today - weekStartsOn + 7) % 7;
  const start = -daysSinceStart + weekOffset * 7;
  const end = start + 6;

  const startDate = dateWithOffset(start, now);
  const endDate = dateWithOffset(end, now);
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const label =
    weekOffset === 0
      ? `This week · ${fmt(startDate)} – ${fmt(endDate)}`
      : `${fmt(startDate)} – ${fmt(endDate)}`;

  return { start, end, label, weekStartKey: isoDate(startDate) };
}

export function weekKey(
  weekStartsOn: WeekStartDay,
  weekOffset = 0,
  now: Date = new Date()
): string {
  return weekRange(weekStartsOn, weekOffset, now).weekStartKey;
}

export function isDayInWeek(dayOffset: number | null, start: number, end: number): boolean {
  if (dayOffset === null) return false;
  return dayOffset >= start && dayOffset <= end;
}
