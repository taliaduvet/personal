/** Human-readable age since a task was captured (matches Parking Lot style). */
export function formatParkedDuration(ms: number): string {
  const days = Math.floor(ms / 86_400_000);
  if (days < 1) return "Today";
  if (days === 1) return "1d";
  if (days < 7) return `${days}d`;
  if (days < 30) return `${Math.floor(days / 7)}w`;
  if (days < 365) return `${Math.floor(days / 30)}mo`;
  return `${Math.floor(days / 365)}y`;
}

export function parkedLabel(parkedAt: number): string {
  const duration = formatParkedDuration(Date.now() - parkedAt);
  return duration === "Today" ? "Parked today" : `Parked ${duration}`;
}

export function parkedDays(parkedAt: number): number {
  return Math.floor((Date.now() - parkedAt) / 86_400_000);
}

export function isStaleParked(parkedAt: number, thresholdDays = 30): boolean {
  return parkedDays(parkedAt) >= thresholdDays;
}
