export type RawCalendarEvent = {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  transparency?: string | null;
  status?: string | null;
};

export type TimedEventSlice = {
  id: string;
  summary: string;
  dateKey: string;
  startMs: number;
  endMs: number;
};

export type AllDayEvent = {
  id: string;
  summary: string;
  dateKey: string;
};

export type AllDayDisposition = "ignore" | "blocks";

export type DayCommitment = {
  dateKey: string;
  /** Merged timed commitment hours for this calendar day. */
  timedHours: number;
  timedEvents: TimedEventSlice[];
  allDayEvents: AllDayEvent[];
  /** True when any all-day event is marked "blocks whole day". */
  blocked: boolean;
};

export function allDayDispositionKey(dateKey: string, eventId: string): string {
  return `${dateKey}:${eventId}`;
}
