"use client";

import { CalendarConnect } from "@/components/CalendarConnect";
import { PROJECTS, WORK_MODES } from "@/lib/sample-data";
import { commitmentBarFill } from "@/lib/calendar/commitment";
import type { AllDayDisposition, DayCommitment } from "@/lib/calendar/types";
import { allDayDispositionKey } from "@/lib/calendar/types";
import { formatLocalTimeRange } from "@/lib/local-date";
import {
  focusLabel,
  tasksForDayFocus,
  type DayFocus,
  type WeekDayFocusEntry,
  type WeekDaySlot,
} from "@/lib/week-focus";
import type { Task } from "@/lib/types";

type Props = {
  slot: WeekDaySlot;
  entry: WeekDayFocusEntry;
  commitment: DayCommitment;
  calendarLoading: boolean;
  calendarError: string | null;
  calendarConnected: boolean;
  allDayDispositions: Record<string, AllDayDisposition>;
  tasks: Task[];
  weekStartsOn: Parameters<typeof tasksForDayFocus>[3];
  onFocus: (focus: DayFocus | null) => void;
  onNote: (note: string) => void;
  onAllDayDisposition: (dateKey: string, eventId: string, value: AllDayDisposition) => void;
  onClose?: () => void;
};

export function DayPlanningPanel({
  slot,
  entry,
  commitment,
  calendarLoading,
  calendarError,
  calendarConnected,
  allDayDispositions,
  tasks,
  weekStartsOn,
  onFocus,
  onNote,
  onAllDayDisposition,
  onClose,
}: Props) {
  const matching = entry.focus
    ? tasksForDayFocus(tasks, entry.focus, slot.offset, weekStartsOn).slice(0, 5)
    : [];

  const dateLabel =
    slot.offset === 0
      ? "Today"
      : slot.offset === 1
        ? "Tomorrow"
        : `${slot.weekday}, ${slot.dayNum}`;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-2 border-b border-line px-4 py-3">
        <div>
          <h3 className="font-display text-base font-semibold text-ink">{dateLabel}</h3>
          {commitment.blocked ? (
            <p className="mt-0.5 text-sm font-medium text-[#bc6740]">Marked as blocked</p>
          ) : commitment.timedHours > 0 ? (
            <p className="mt-0.5 text-sm text-muted">
              <span className="font-medium text-ink">{commitment.timedHours}h</span> on calendar
            </p>
          ) : (
            <p className="mt-0.5 text-sm text-muted">Light calendar day</p>
          )}
        </div>
        {onClose && (
          <button type="button" onClick={onClose} className="text-sm text-muted hover:text-ink lg:hidden">
            Done
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {/* Calendar load */}
        {calendarLoading && (
          <p className="text-xs text-muted">Loading calendar…</p>
        )}
        {calendarError && (
          <p className="text-xs text-[#bc6740]">{calendarError}</p>
        )}
        {!calendarConnected && !calendarLoading && (
          <div className="mb-3">
            <CalendarConnect compact />
          </div>
        )}

        {calendarConnected && !calendarLoading && (
          <section>
            {commitment.timedEvents.length > 0 ? (
              <ul className="space-y-1.5">
                {commitment.timedEvents.map((ev) => (
                  <li
                    key={ev.id}
                    className="rounded-lg border border-line bg-canvas/50 px-2.5 py-2 text-xs"
                  >
                    <span className="font-medium text-muted">
                      {formatLocalTimeRange(ev.startMs, ev.endMs)}
                    </span>
                    <p className="mt-0.5 text-sm text-ink">{ev.summary}</p>
                  </li>
                ))}
              </ul>
            ) : (
              !commitment.blocked && (
                <p className="text-xs text-muted">No timed events this day.</p>
              )
            )}

            {commitment.allDayEvents.length > 0 && (
              <div className="mt-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-faint">All day</p>
                <ul className="mt-2 space-y-2">
                  {commitment.allDayEvents.map((ev) => {
                    const key = allDayDispositionKey(slot.dateKey, ev.id);
                    const disposition = allDayDispositions[key] ?? "ignore";
                    return (
                      <li key={ev.id} className="rounded-lg border border-line bg-canvas/40 px-2.5 py-2">
                        <p className="text-sm text-ink">{ev.summary}</p>
                        <select
                          value={disposition}
                          onChange={(e) =>
                            onAllDayDisposition(
                              slot.dateKey,
                              ev.id,
                              e.target.value as AllDayDisposition
                            )
                          }
                          className="mt-1.5 w-full rounded-md border border-border bg-surface px-2 py-1 text-xs text-ink"
                        >
                          <option value="ignore">Ignore for load</option>
                          <option value="blocks">Blocks whole day</option>
                        </select>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {commitment.timedHours > 0 && (
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line">
                <div
                  className="h-full rounded-full bg-accent transition-all"
                  style={{ width: `${commitmentBarFill(commitment.timedHours) * 100}%` }}
                />
              </div>
            )}
          </section>
        )}

        <div className="my-4 border-t border-line" />

        <section>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-faint">Day focus</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {WORK_MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => onFocus({ kind: "mode", id: m.id })}
                className={[
                  "rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors",
                  entry.focus?.kind === "mode" && entry.focus.id === m.id
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-border text-muted hover:border-accent hover:text-ink",
                ].join(" ")}
              >
                {m.name}
              </button>
            ))}
            <button
              type="button"
              onClick={() => onFocus(null)}
              className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-faint hover:text-muted"
            >
              Open
            </button>
          </div>

          <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-faint">Project override</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {PROJECTS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onFocus({ kind: "project", id: p.id })}
                className={[
                  "rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors",
                  entry.focus?.kind === "project" && entry.focus.id === p.id
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-border text-muted hover:border-accent hover:text-ink",
                ].join(" ")}
              >
                {p.name}
              </button>
            ))}
          </div>

          {entry.focus && (
            <p className="mt-2 text-xs text-accent">{focusLabel(entry.focus)}</p>
          )}

          <label className="mt-3 block">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-faint">Day note</span>
            <textarea
              value={entry.note}
              onChange={(e) => onNote(e.target.value)}
              rows={2}
              placeholder="Optional — e.g. studio after lunch"
              className="mt-1.5 w-full resize-none rounded-lg border border-border bg-canvas px-2.5 py-2 text-sm text-ink outline-none focus:border-accent"
              maxLength={400}
            />
          </label>

          {matching.length > 0 && (
            <div className="mt-3 border-t border-line pt-3">
              <p className="text-xs text-faint">
                {matching.length} matching task{matching.length !== 1 ? "s" : ""}
              </p>
              <ul className="mt-1 space-y-0.5">
                {matching.map((t) => (
                  <li key={t.id} className="truncate text-sm text-muted">
                    {t.title}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
