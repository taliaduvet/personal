"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTasks } from "@/lib/store";
import { isInboxTask, lifeAreaName, workModeName } from "@/lib/lenses";

export function InboxView() {
  const { tasks, addTask, completeTask, sendToToday, openTask } = useTasks();
  const [text, setText] = useState("");
  const [flash, setFlash] = useState(false);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The triage pile: captures that haven't been filed into an area, project,
  // or day yet. Sorting one anywhere removes it from here.
  const items = useMemo(() => tasks.filter(isInboxTask), [tasks]);

  useEffect(
    () => () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
    },
    []
  );

  const capture = () => {
    const v = text.trim();
    if (!v) return;
    addTask(v);
    setText("");
    setFlash(true);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(false), 2400);
  };

  return (
    <section className="mx-auto max-w-2xl">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">Inbox</h1>
      <p className="mt-1 text-muted">
        Dump it here now — sort it into a life area, project, or day whenever. Capture beats structure.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          capture();
        }}
        className="mt-4 flex gap-2"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What's on your mind?"
          aria-label="Capture a thought"
          className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none placeholder:text-faint focus:border-accent"
        />
        <button
          type="submit"
          disabled={text.trim().length === 0}
          className="shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-ink disabled:opacity-50"
        >
          Add
        </button>
      </form>

      <div className="mt-2 h-5" aria-live="polite">
        {flash && (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-release">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="m5 13 4 4L19 7" />
            </svg>
            Captured — it&apos;s safe in your Inbox.
          </span>
        )}
      </div>

      {items.length > 0 ? (
        <div className="mt-3 space-y-2">
          {items.map((it) => (
            <div
              key={it.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2.5"
            >
              <button
                type="button"
                onClick={() => completeTask(it.id)}
                aria-label="Mark done"
                className="h-4 w-4 shrink-0 rounded-full border-2 border-faint transition-colors hover:border-accent"
              />
              <button
                type="button"
                onClick={() => openTask(it.id)}
                className="min-w-0 flex-1 text-left"
                aria-label={`Open ${it.title}`}
              >
                <p className="truncate text-sm text-ink">{it.title}</p>
                <p className="mt-0.5 text-xs text-faint">{lifeAreaName(it.lifeAreaId)} · tap to sort</p>
              </button>
              {it.workModeId && (
                <span className="shrink-0 rounded bg-canvas px-1.5 py-0.5 text-xs text-muted">
                  {workModeName(it.workModeId)}
                </span>
              )}
              <button
                type="button"
                onClick={() => sendToToday(it.id)}
                className="shrink-0 rounded-md border border-border px-2 py-1 text-xs font-medium text-muted transition-colors hover:border-accent hover:text-accent"
                title="Pull into Today"
              >
                → Today
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-border bg-surface p-6 text-center">
          <p className="font-display text-lg font-semibold text-ink">Inbox zero.</p>
          <p className="mt-1 text-sm text-muted">Nothing waiting to be sorted. Capture the next thought above.</p>
        </div>
      )}
    </section>
  );
}
