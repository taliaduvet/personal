"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTasks } from "@/lib/store";
import { useSettings } from "@/lib/settings-store";
import { filterShipped, groupShippedByMonth } from "@/lib/shelf";
import { getActiveLifeAreas } from "@/lib/life-area-registry";
import { getActiveProjects } from "@/lib/project-registry";
import { ShelfRow } from "@/components/ShelfRow";

export function ShelfView({
  initialProjectId,
  initialAreaId,
}: {
  initialProjectId?: string | null;
  initialAreaId?: string | null;
}) {
  const { tasks } = useTasks();
  const { lifeAreas } = useSettings();
  const [projectId, setProjectId] = useState<string | "">(initialProjectId ?? "");
  const [lifeAreaId, setLifeAreaId] = useState<string | "">(initialAreaId ?? "");

  const filtered = useMemo(
    () =>
      filterShipped(tasks, {
        projectId: projectId || null,
        lifeAreaId: lifeAreaId || null,
      }),
    [tasks, projectId, lifeAreaId]
  );

  const groups = useMemo(() => groupShippedByMonth(filtered), [filtered]);
  const areas = lifeAreas.length > 0 ? lifeAreas : getActiveLifeAreas();
  const projects = getActiveProjects().filter((p) =>
    filtered.some((t) => t.projectId === p.id) || tasks.some((t) => t.projectId === p.id && t.status === "done")
  );

  return (
    <section>
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">Shelf</h1>
        <p className="mt-1 text-muted">Everything you shipped — a mirror, not a scoreboard.</p>
      </header>

      <div className="mt-4 flex flex-wrap gap-2">
        <select
          value={lifeAreaId}
          onChange={(e) => setLifeAreaId(e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent"
        >
          <option value="">All life areas</option>
          {areas.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent"
        >
          <option value="">All projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="mt-8 text-sm text-muted">
          Nothing on the wall yet. When you mark tasks done, they land here — proof you&apos;ve been working.
        </p>
      ) : (
        <div className="mt-6 space-y-8">
          {groups.map((g) => (
            <div key={g.key}>
              <h2 className="font-display text-base font-semibold text-ink">{g.label}</h2>
              <div className="mt-3 space-y-2">
                {g.tasks.map((t) => (
                  <ShelfRow key={t.id} task={t} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="mt-8 text-xs text-faint">
        {filtered.length} on the shelf
        {(projectId || lifeAreaId) && (
          <>
            {" · "}
            <Link href="/archive?tab=shelf" className="text-accent hover:text-accent-ink">
              Clear filters
            </Link>
          </>
        )}
      </p>
    </section>
  );
}
