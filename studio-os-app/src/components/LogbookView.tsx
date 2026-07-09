"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTasks } from "@/lib/store";
import { useSettings } from "@/lib/settings-store";
import { composeDayPage, dayKeysWithActivity } from "@/lib/logbook";
import { localDateKey } from "@/lib/local-date";
import { openTaskWork } from "@/lib/navigation";

export function LogbookView() {
  const router = useRouter();
  const { tasks, activityLog, reviewNotes, logbookLines, saveLogbookLine } = useTasks();
  const { weekStartsOn } = useSettings();

  const dayKeys = useMemo(
    () => dayKeysWithActivity(tasks, activityLog, logbookLines),
    [tasks, activityLog, logbookLines]
  );

  const [dateKey, setDateKey] = useState(() => localDateKey(new Date()));
  const [draftLine, setDraftLine] = useState("");

  useEffect(() => {
    setDraftLine(logbookLines[dateKey] ?? "");
  }, [dateKey, logbookLines]);

  const page = useMemo(
    () => composeDayPage(dateKey, tasks, activityLog, reviewNotes, logbookLines, weekStartsOn),
    [dateKey, tasks, activityLog, reviewNotes, logbookLines, weekStartsOn]
  );

  const idx = dayKeys.indexOf(dateKey);
  const hasPrev = idx >= 0 && idx < dayKeys.length - 1;
  const hasNext = idx > 0;

  function goPrev() {
    if (hasPrev) setDateKey(dayKeys[idx + 1]!);
  }

  function goNext() {
    if (hasNext) setDateKey(dayKeys[idx - 1]!);
  }

  function saveLine() {
    saveLogbookLine(dateKey, draftLine);
  }

  return (
    <section>
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">Logbook</h1>
        <p className="mt-1 text-muted">Assembled from what you already did — sessions, ships, reflections.</p>
      </header>

      <div className="mt-4 flex items-center justify-between rounded-xl border border-border bg-surface px-3 py-2">
        <button
          type="button"
          onClick={goPrev}
          disabled={!hasPrev}
          className="rounded-lg px-2 py-1 text-sm text-muted hover:bg-canvas hover:text-ink disabled:opacity-30"
        >
          ←
        </button>
        <span className="text-sm font-medium text-ink">{page.label}</span>
        <button
          type="button"
          onClick={goNext}
          disabled={!hasNext}
          className="rounded-lg px-2 py-1 text-sm text-muted hover:bg-canvas hover:text-ink disabled:opacity-30"
        >
          →
        </button>
      </div>

      <div className="mt-4 rounded-xl border border-border bg-surface p-4">
        <label className="text-[10px] font-semibold uppercase tracking-wide text-faint">A line in the log</label>
        <textarea
          value={draftLine}
          onChange={(e) => setDraftLine(e.target.value)}
          onBlur={saveLine}
          rows={2}
          placeholder="Optional — how did the day feel?"
          className="mt-2 w-full resize-y rounded-lg border border-border bg-canvas px-3 py-2 text-sm leading-relaxed text-ink outline-none placeholder:text-faint focus:border-accent"
        />
        <p className="mt-1 text-xs text-faint">Skips are normal. This never shows as a gap.</p>
      </div>

      {page.sections.length === 0 ? (
        <p className="mt-6 text-sm text-muted">Quiet day — no ships or sessions logged yet.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {page.sections.map((s, i) => (
            <li key={`${s.kind}-${i}`} className="rounded-xl border border-border bg-surface px-4 py-3">
              {s.kind === "shipped" && (
                <button
                  type="button"
                  onClick={() => openTaskWork(router, s.taskId)}
                  className="w-full text-left"
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-faint">Shipped</p>
                  <p className="mt-1 text-sm text-ink">{s.title}</p>
                </button>
              )}
              {s.kind === "session" && (
                <button
                  type="button"
                  onClick={() => openTaskWork(router, s.taskId)}
                  className="w-full text-left"
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-faint">
                    Studio session · {s.durationLabel}
                  </p>
                  <p className="mt-1 text-sm text-ink">{s.title}</p>
                  {s.reentryNote?.trim() && (
                    <p className="mt-1 text-sm text-muted">&ldquo;{s.reentryNote}&rdquo;</p>
                  )}
                </button>
              )}
              {s.kind === "reflection" && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-faint">Weekly reflection</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{s.snippet}</p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
