"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTasks } from "@/lib/store";
import {
  deadlineLabel,
  groupDeadlines,
  lifeAreaColor,
  lifeAreaName,
  projectName,
  projectWhy,
} from "@/lib/lenses";

export function DeadlinesView() {
  const router = useRouter();
  const { tasks } = useTasks();

  const groups = useMemo(() => groupDeadlines(tasks), [tasks]);
  const total = groups.reduce((n, g) => n + g.tasks.length, 0);

  return (
    <section className="mx-auto max-w-2xl">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">Horizon</h1>
      <p className="mt-1 text-muted">
        Hard external deadlines only — the rare commitments that actually need pressure. Each one shows what it&apos;s for.
      </p>

      {total > 0 ? (
        <div className="mt-6 space-y-6">
          {groups.map((g) => (
            <div key={g.key}>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-faint">{g.label}</h2>
              <ul className="mt-2 space-y-2">
                {g.tasks.map((t) => {
                  const deadline = deadlineLabel(t.deadlineInDays);
                  const why = projectWhy(t.projectId);
                  return (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => router.push(`/tasks/${t.id}`)}
                        className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-left transition-colors hover:border-accent"
                        style={{ borderLeft: `3px solid ${lifeAreaColor(t.lifeAreaId)}` }}
                      >
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="text-sm font-medium text-ink">{t.title}</span>
                          {deadline && (
                            <span
                              className={[
                                "shrink-0 text-xs font-medium",
                                deadline.tone === "danger" ? "text-danger" : "text-muted",
                              ].join(" ")}
                            >
                              {deadline.text}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-muted">
                          {t.projectId ? (
                            <>
                              <span className="font-medium text-accent">→ {projectName(t.projectId)}</span>
                              {" · "}
                            </>
                          ) : null}
                          {lifeAreaName(t.lifeAreaId)}
                        </p>
                        {why && (
                          <p className="mt-1 line-clamp-2 text-xs italic text-faint">&ldquo;{why}&rdquo;</p>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-border bg-surface p-6 text-center">
          <p className="font-display text-lg font-semibold text-ink">Clear horizon.</p>
          <p className="mt-1 text-sm text-muted">No hard deadlines looming. That&apos;s a good place to be.</p>
        </div>
      )}
    </section>
  );
}
