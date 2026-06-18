"use client";

import { useEffect, useRef, useState } from "react";
import { TASKS } from "@/lib/sample-data";
import { workModeName } from "@/lib/lenses";

type InboxItem = { id: string; title: string; workModeId: string | null };

// The true triage pile: captured, but with no project, no plan, no deadline yet.
const SEED: InboxItem[] = TASKS.filter(
  (t) => t.projectId === null && t.doDateInDays === null && t.deadlineInDays === null && t.status !== "done"
).map((t) => ({ id: t.id, title: t.title, workModeId: t.workModeId }));

export function InboxView() {
  const [items, setItems] = useState<InboxItem[]>(SEED);
  const [text, setText] = useState("");
  const [flash, setFlash] = useState(false);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (flashTimer.current) clearTimeout(flashTimer.current);
  }, []);

  const capture = () => {
    const v = text.trim();
    if (!v) return;
    setItems((i) => [{ id: `new-${Date.now()}`, title: v, workModeId: null }, ...i]);
    setText("");
    setFlash(true);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(false), 2400);
  };

  const triage = (id: string) => setItems((i) => i.filter((x) => x.id !== id));

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
                onClick={() => triage(it.id)}
                aria-label="Clear from inbox"
                className="h-4 w-4 shrink-0 rounded-full border-2 border-faint transition-colors hover:border-accent"
              />
              <span className="min-w-0 flex-1 truncate text-sm text-ink">{it.title}</span>
              {it.workModeId ? (
                <span className="shrink-0 rounded bg-canvas px-1.5 py-0.5 text-xs text-muted">
                  {workModeName(it.workModeId)}
                </span>
              ) : (
                <span className="shrink-0 text-xs text-faint">Unsorted</span>
              )}
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
