import { dateWithOffset } from "./do-plan";

/** e.g. "Jul 11 · in 3 days" or "Jul 8 · today" */
export function formatRelativeDayOffset(offset: number, now = new Date()): string {
  const d = dateWithOffset(offset);
  const datePart = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });

  if (offset < 0) {
    const days = Math.abs(offset);
    return `${datePart} · ${days === 1 ? "1 day over" : `${days} days over`}`;
  }
  if (offset === 0) return `${datePart} · today`;
  if (offset === 1) return `${datePart} · tomorrow`;
  return `${datePart} · in ${offset} days`;
}

export function formatDeadlineDisplay(deadlineInDays: number): string {
  return formatRelativeDayOffset(deadlineInDays);
}
