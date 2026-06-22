/** YYYY-MM-DD in local timezone (never UTC slice). */
export function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Local midnight for a YYYY-MM-DD key. */
export function dateKeyStartMs(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
}

export function dateKeyEndMs(dateKey: string): number {
  return dateKeyStartMs(dateKey) + 86_400_000;
}

/** Format ms as local time "10:00 AM". */
export function formatLocalTime(ms: number): string {
  return new Date(ms).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function formatLocalTimeRange(startMs: number, endMs: number): string {
  return `${formatLocalTime(startMs)}–${formatLocalTime(endMs)}`;
}
