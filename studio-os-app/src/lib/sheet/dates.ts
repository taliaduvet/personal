import { offsetFromToday } from "@/lib/do-plan";

/** Parse a Sheets cell value (serial number or string) into a local calendar date. */
export function parseSheetDate(value: unknown): Date | null {
  if (value == null || value === "") return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const d = new Date(value);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const utcDays = Math.floor(value - 25569);
    const utc = new Date(utcDays * 86_400_000);
    return new Date(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate());
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      parsed.setHours(0, 0, 0, 0);
      return parsed;
    }
  }

  return null;
}

export function sheetDateToDayOffset(value: unknown): number | null {
  const date = parseSheetDate(value);
  if (!date) return null;
  return offsetFromToday(date);
}

export function sheetDateToUnixMs(value: unknown): number | null {
  const date = parseSheetDate(value);
  if (!date) return null;
  return date.getTime();
}

/** Local calendar date → Google Sheets serial (midnight UTC epoch). */
export function dateToSheetSerial(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const utcMs = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return utcMs / 86_400_000 + 25569;
}

export function dayOffsetToSheetSerial(offset: number | null): number | "" {
  if (offset === null) return "";
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(0, 0, 0, 0);
  return dateToSheetSerial(d);
}

export function unixMsToSheetSerial(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return dateToSheetSerial(d);
}
