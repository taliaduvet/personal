import { dateKeyEndMs, dateKeyStartMs, localDateKey } from "../local-date";
import type {
  AllDayDisposition,
  AllDayEvent,
  DayCommitment,
  RawCalendarEvent,
  TimedEventSlice,
} from "./types";
import { allDayDispositionKey } from "./types";

const MS_HOUR = 3_600_000;

export function roundHalfHour(hours: number): number {
  return Math.round(hours * 2) / 2;
}

export function mergeIntervals(intervals: [number, number][]): [number, number][] {
  if (intervals.length === 0) return [];
  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [[sorted[0][0], sorted[0][1]]];
  for (let i = 1; i < sorted.length; i++) {
    const [s, e] = sorted[i];
    const last = merged[merged.length - 1];
    if (s <= last[1]) {
      last[1] = Math.max(last[1], e);
    } else {
      merged.push([s, e]);
    }
  }
  return merged;
}

export function mergedIntervalHours(intervals: [number, number][]): number {
  const merged = mergeIntervals(intervals);
  const ms = merged.reduce((sum, [s, e]) => sum + (e - s), 0);
  return roundHalfHour(ms / MS_HOUR);
}

function isCancelled(ev: RawCalendarEvent): boolean {
  return ev.status === "cancelled";
}

function isTransparent(ev: RawCalendarEvent): boolean {
  return ev.transparency === "transparent";
}

function isAllDay(ev: RawCalendarEvent): boolean {
  return Boolean(ev.start.date && !ev.start.dateTime);
}

function timedBounds(ev: RawCalendarEvent): { startMs: number; endMs: number } | null {
  if (!ev.start.dateTime) return null;
  const startMs = new Date(ev.start.dateTime).getTime();
  const endRaw = ev.end?.dateTime ?? ev.start.dateTime;
  const endMs = new Date(endRaw).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return null;
  return { startMs, endMs };
}

/** Clip a timed event to one local calendar day. */
export function sliceTimedEventForDay(
  ev: RawCalendarEvent,
  dateKey: string
): TimedEventSlice | null {
  if (isCancelled(ev) || isTransparent(ev) || isAllDay(ev)) return null;
  const bounds = timedBounds(ev);
  if (!bounds) return null;

  const dayStart = dateKeyStartMs(dateKey);
  const dayEnd = dateKeyEndMs(dateKey);
  const startMs = Math.max(bounds.startMs, dayStart);
  const endMs = Math.min(bounds.endMs, dayEnd);
  if (endMs <= startMs) return null;

  return {
    id: ev.id,
    summary: ev.summary?.trim() || "(No title)",
    dateKey,
    startMs,
    endMs,
  };
}

export function allDayEventForDay(ev: RawCalendarEvent, dateKey: string): AllDayEvent | null {
  if (isCancelled(ev) || isTransparent(ev) || !isAllDay(ev)) return null;
  const dk = ev.start.date;
  if (!dk || dk !== dateKey) return null;
  return {
    id: ev.id,
    summary: ev.summary?.trim() || "(No title)",
    dateKey: dk,
  };
}

export function computeDayCommitment(
  dateKey: string,
  events: RawCalendarEvent[],
  allDayDispositions: Record<string, AllDayDisposition> = {}
): DayCommitment {
  const timedEvents: TimedEventSlice[] = [];
  const allDayEvents: AllDayEvent[] = [];
  const seenTimed = new Set<string>();
  const seenAllDay = new Set<string>();

  for (const ev of events) {
    const slice = sliceTimedEventForDay(ev, dateKey);
    if (slice && !seenTimed.has(slice.id)) {
      seenTimed.add(slice.id);
      timedEvents.push(slice);
    }
    const allDay = allDayEventForDay(ev, dateKey);
    if (allDay && !seenAllDay.has(allDay.id)) {
      seenAllDay.add(allDay.id);
      allDayEvents.push(allDay);
    }
  }

  timedEvents.sort((a, b) => a.startMs - b.startMs);

  const intervals: [number, number][] = timedEvents.map((e) => [e.startMs, e.endMs]);
  const timedHours = mergedIntervalHours(intervals);

  const blocked = allDayEvents.some(
    (e) => allDayDispositions[allDayDispositionKey(dateKey, e.id)] === "blocks"
  );

  return { dateKey, timedHours, timedEvents, allDayEvents, blocked };
}

export function computeWeekCommitments(
  dateKeys: string[],
  events: RawCalendarEvent[],
  allDayDispositions: Record<string, AllDayDisposition> = {}
): DayCommitment[] {
  return dateKeys.map((dk) => computeDayCommitment(dk, events, allDayDispositions));
}

/** Bar fill 0–1 for display; 10h = full bar. */
export function commitmentBarFill(timedHours: number, maxHours = 10): number {
  return Math.min(1, Math.max(0, timedHours / maxHours));
}

/** Compact label for day cell, e.g. "6.5h" or "Blocked". */
export function commitmentCellLabel(commitment: DayCommitment): string | null {
  if (commitment.blocked) return "Blocked";
  if (commitment.timedHours > 0) return `${commitment.timedHours}h`;
  if (commitment.allDayEvents.length > 0) return `+${commitment.allDayEvents.length} all-day`;
  return null;
}

/** Re-export for tests that assert date keys on timed events. */
export { localDateKey };
