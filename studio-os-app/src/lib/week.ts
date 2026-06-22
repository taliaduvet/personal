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

function dateWithOffset(offset: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Configurable week window. weekOffset 0 = this week, -1 = last week, 1 = next week. */
export function weekRange(weekStartsOn: WeekStartDay, weekOffset = 0): WeekRange {
  const today = new Date().getDay() as WeekStartDay;
  const daysSinceStart = (today - weekStartsOn + 7) % 7;
  const start = -daysSinceStart + weekOffset * 7;
  const end = start + 6;

  const startDate = dateWithOffset(start);
  const endDate = dateWithOffset(end);
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const label =
    weekOffset === 0
      ? `This week · ${fmt(startDate)} – ${fmt(endDate)}`
      : `${fmt(startDate)} – ${fmt(endDate)}`;

  return { start, end, label, weekStartKey: isoDate(startDate) };
}

export function weekKey(weekStartsOn: WeekStartDay, weekOffset = 0): string {
  return weekRange(weekStartsOn, weekOffset).weekStartKey;
}

export function isDayInWeek(dayOffset: number | null, start: number, end: number): boolean {
  if (dayOffset === null) return false;
  return dayOffset >= start && dayOffset <= end;
}
