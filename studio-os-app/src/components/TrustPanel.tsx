"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTasks } from "@/lib/store";
import { openTaskWork } from "@/lib/navigation";
import { summarize, reasonLabel, overdueLabel } from "@/lib/trust/summary";
import { localDateKey } from "@/lib/local-date";
import type { Task } from "@/lib/types";
import { commitmentPerson } from "@/lib/trust/commitments";

/**
 * THE STATE OF THINGS — the surface that answers "is everything held?".
 *
 * Design rules it has to obey (docs/TRUST-CORE.md §4, §7):
 *  - The all-clear is **stated**, not implied by an empty list. Silence and
 *    breakage must never look the same (principle 8).
 *  - Only what needs you is listed. The dormant pile is counted, never
 *    enumerated — parked work is safe, and listing it manufactures pressure
 *    (principles 3, 13).
 *  - Wording is informational, never imperative. No urgency escalation, no
 *    streaks, no counts framed as depletion.
 */
export function TrustPanel() {
  const { tasks, updateTask } = useTasks();
  const router = useRouter();

  const markSent = (id: string) =>
    updateTask(id, { deliveredAt: new Date().toISOString() });

  // Clock-dependent, so it must be client-only or SSR and client disagree.
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);

  const summary = useMemo(() => (now ? summarize(tasks, now) : null), [tasks, now]);

  if (!now || !summary) {
    return <div className="h-[72px] rounded-xl border border-border bg-surface" aria-hidden />;
  }

  const todayKey = localDateKey(now);
  const open = (t: Task) => openTaskWork(router, t.id);

  const atRisk = summary.needsYou.length + summary.handoffs.length;

  return (
    <section
      className="rounded-xl border border-border bg-surface"
      aria-label="What needs you"
    >
      <header className="flex items-baseline justify-between gap-3 px-4 pt-3.5">
        {summary.allClear ? (
          <p className="text-sm font-medium text-ink">
            <span className="text-accent">✓</span>{" "}Everything&apos;s held
          </p>
        ) : (
          <p className="text-sm font-medium text-ink">
            {atRisk === 1 ? "1 thing needs you" : `${atRisk} things need you`}
          </p>
        )}
        <span className="shrink-0 text-xs text-faint">
          {summary.heldCount} held
        </span>
      </header>

      {summary.allClear && (
        <p className="px-4 pb-1 pt-1 text-xs text-muted">
          Nothing is at risk and nobody is waiting on you.
        </p>
      )}

      {atRisk > 0 && (
        <ul className="mt-2 divide-y divide-line border-t border-line">
          {summary.handoffs.map(({ task, person, theirDeadline }) => {
            const late = overdueLabel(theirDeadline, todayKey);
            return (
              <li key={`h-${task.id}`}>
                <Row
                  title={task.title}
                  meta={`${person} needs to come back to you${late ? ` · ${late}` : ""}`}
                  tone="attention"
                  onClick={() => open(task)}
                />
              </li>
            );
          })}

          {summary.needsYou.map(({ task, disposition }) => {
            const trigger = disposition.state === "triggered" ? disposition.trigger : null;
            const late = trigger ? overdueLabel(trigger.dateKey, todayKey) : null;
            return (
              <li key={`d-${task.id}`}>
                <Row
                  title={task.title}
                  meta={[trigger ? reasonLabel(trigger.reason, task) : null, late]
                    .filter(Boolean)
                    .join(" · ")}
                  onClick={() => open(task)}
                />
              </li>
            );
          })}

        </ul>
      )}

      {summary.awaitingDelivery.length > 0 && (
        <ul className="divide-y divide-line border-t border-line">
          {summary.awaitingDelivery.map((task) => {
            const person = commitmentPerson(task);
            return (
              <li key={`s-${task.id}`} className="flex items-baseline gap-2 px-4 py-2.5">
                <button
                  type="button"
                  onClick={() => open(task)}
                  className="min-w-0 flex-1 truncate text-left text-sm text-muted hover:text-ink"
                >
                  {task.title}
                </button>
                <span className="shrink-0 text-xs text-faint">
                  {person ? `did you tell ${person}?` : "did you send it?"}
                </span>
                <button
                  type="button"
                  onClick={() => markSent(task.id)}
                  className="shrink-0 rounded-md border border-border px-2 py-0.5 text-[11px] text-muted hover:border-accent hover:text-accent"
                >
                  sent ✓
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <footer className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line px-4 py-2.5 text-xs text-faint">
        {summary.scheduledToday.length > 0 && (
          <Link href="/today" className="text-muted hover:text-accent">
            {summary.scheduledToday.length} planned for today →
          </Link>
        )}
        {summary.slipped.length > 0 && (
          <Link href="/tasks?lens=when" className="hover:text-accent">
            {summary.slipped.length} slipped off your plan
          </Link>
        )}
        {summary.dormantCount > 0 && (
          <span>
            {summary.dormantCount} parked
            {summary.oldestDormantDays > 0 && ` · oldest ${summary.oldestDormantDays}d`} — comes
            up at the weekly review
          </span>
        )}
        {summary.faultCount > 0 && (
          <span className="text-danger">
            {summary.faultCount} with a date I can&apos;t read
          </span>
        )}
      </footer>
    </section>
  );
}

function Row({
  title,
  meta,
  tone,
  onClick,
}: {
  title: string;
  meta: string;
  tone?: "attention";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-baseline gap-3 px-4 py-2.5 text-left transition-colors hover:bg-canvas"
    >
      <span className="min-w-0 flex-1 truncate text-sm text-ink">{title}</span>
      <span
        className={[
          "shrink-0 text-xs",
          tone === "attention" ? "text-danger" : "text-muted",
        ].join(" ")}
      >
        {meta}
      </span>
    </button>
  );
}
