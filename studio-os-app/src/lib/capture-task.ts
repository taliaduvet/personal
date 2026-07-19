import type { Task } from "./types";
import type { CaptureParseResult } from "./capture-parse";
import { addDaysToDateKey, localDateKey, parseLocalDateKey } from "./local-date";

const TITLE_MAX = 120;

/** Infer respond-by from obvious keywords; else tomorrow (fallback when Gemini absent). */
export function inferRespondByDateKey(text: string, from = new Date()): string {
  const lower = text.toLowerCase();
  const today = localDateKey(from);
  if (/\b(today|eod|end of day|asap|urgent)\b/.test(lower)) return today;
  if (/\btomorrow\b/.test(lower)) return addDaysToDateKey(today, 1);
  return addDaysToDateKey(today, 1);
}

/** Prefer Gemini's respondInDays; else keyword fallback. */
export function respondByFromParse(
  parsed: CaptureParseResult | null | undefined,
  text: string,
  from = new Date()
): string {
  const today = localDateKey(from);
  if (parsed?.respondInDays != null && Number.isFinite(parsed.respondInDays)) {
    return addDaysToDateKey(today, Math.max(0, Math.min(21, Math.round(parsed.respondInDays))));
  }
  return inferRespondByDateKey(text, from);
}

export function titleFromCaptureText(text: string): string {
  const line = text.trim().split(/\r?\n/).find((l) => l.trim()) ?? text.trim();
  const cleaned = line.replace(/\s+/g, " ").trim();
  if (cleaned.length <= TITLE_MAX) return cleaned || "Need to respond";
  return `${cleaned.slice(0, TITLE_MAX - 1)}…`;
}

export function buildNeedsRespondCaptureTask(input: {
  text: string;
  id?: string;
  now?: Date;
  lifeAreaId?: string;
  parsed?: CaptureParseResult | null;
}): Task {
  const now = input.now ?? new Date();
  const text = input.text.trim();
  const parsed = input.parsed ?? null;
  const id =
    input.id ??
    (typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);

  const notes = parsed?.message?.trim() || text;
  const title = parsed?.title?.trim() || titleFromCaptureText(text);
  const respondByDateKey = respondByFromParse(parsed, notes, now);

  return {
    id,
    title,
    lifeAreaId: input.lifeAreaId ?? "people",
    projectId: null,
    workModeId: null,
    doPlan: null,
    deadlineDateKey: null,
    deadlineInDays: null,
    status: "todo",
    inToday: false,
    completedAtInDays: null,
    parkedAt: now.getTime(),
    notes,
    subtasks: [],
    personName: parsed?.personName ?? null,
    needsRespond: true,
    respondByDateKey,
    urgencyReason: parsed?.urgencyReason ?? null,
    source: "iphone_share",
  };
}

export type DeferPreset = "tomorrow" | "2d" | "friday" | "week";

/** Next Friday on or after tomorrow (never "today" if today is Friday — skip to next). */
export function nextFridayDateKey(from = new Date()): string {
  const d = parseLocalDateKey(localDateKey(from));
  d.setDate(d.getDate() + 1); // start from tomorrow
  while (d.getDay() !== 5) d.setDate(d.getDate() + 1);
  return localDateKey(d);
}

export function deferRespondByDateKey(preset: DeferPreset, from = new Date()): string {
  const today = localDateKey(from);
  if (preset === "tomorrow") return addDaysToDateKey(today, 1);
  if (preset === "2d") return addDaysToDateKey(today, 2);
  if (preset === "friday") return nextFridayDateKey(from);
  return addDaysToDateKey(today, 7);
}

/**
 * Push come-back by one day. If already future-dated, add a day from that date
 * so Defer always moves the needle (default captures are often "tomorrow").
 */
export function deferRespondOneDay(task: { respondByDateKey?: string | null }, from = new Date()): string {
  const today = localDateKey(from);
  const current = task.respondByDateKey?.trim() || null;
  const base = current && current > today ? current : today;
  return addDaysToDateKey(base, 1);
}
