"use client";

import { useMemo, useState } from "react";
import { useTasks } from "@/lib/store";
import { useSettings } from "@/lib/settings-store";
import { useProjects } from "@/lib/projects-store";
import { collectProjectPeople, contactDetail } from "@/lib/project-people";
import type { Project } from "@/lib/types";

type Props = {
  project: Project;
};

export function ProjectPeopleSection({ project }: Props) {
  const { tasks } = useTasks();
  const { contacts } = useSettings();
  const { addProjectPerson, removeProjectPerson } = useProjects();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const people = useMemo(
    () => collectProjectPeople(project.id, project.personIds ?? [], tasks, contacts),
    [project.id, project.personIds, tasks, contacts]
  );

  const q = query.trim().toLowerCase();
  const filtered = q
    ? contacts.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.email?.toLowerCase().includes(q) ?? false) ||
          (c.phone?.replace(/\D/g, "").includes(q.replace(/\D/g, "")) ?? false)
      )
    : [];
  const existingIds = new Set(people.map((p) => p.id));

  return (
    <section>
      <span className="text-[11px] font-semibold uppercase tracking-wide text-faint">People</span>
      <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
        Collaborators on this project, plus anyone assigned on tasks here.
      </p>

      {people.length > 0 ? (
        <ul className="mt-2 space-y-1.5">
          {people.map((person) => (
            <li
              key={person.id}
              className="group flex items-start justify-between gap-2 rounded-lg border border-line bg-canvas/50 px-2.5 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">{person.name}</p>
                {contactDetail(person) && (
                  <p className="truncate text-[11px] text-muted">{contactDetail(person)}</p>
                )}
                {person.viaTask && !person.attached && (
                  <p className="text-[10px] text-faint">via task</p>
                )}
              </div>
              {person.attached && (
                <button
                  type="button"
                  onClick={() => removeProjectPerson(project.id, person.id)}
                  className="shrink-0 text-[10px] text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:text-ink"
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-xs text-muted">No people linked yet.</p>
      )}

      {open ? (
        <div className="mt-2 rounded-lg border border-border bg-canvas/60 p-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search contacts to add…"
            className="w-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm text-ink outline-none focus:border-accent"
            autoFocus
          />
          <ul className="mt-1.5 max-h-36 space-y-1 overflow-y-auto">
            {!q && <li className="px-2 py-1 text-[11px] text-muted">Type a name or email.</li>}
            {q && filtered.length === 0 && (
              <li className="px-2 py-1 text-[11px] text-muted">No matches — add them from a task’s Person pill first.</li>
            )}
            {filtered.slice(0, 12).map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  disabled={existingIds.has(c.id)}
                  onClick={() => {
                    addProjectPerson(project.id, c.id);
                    setQuery("");
                    setOpen(false);
                  }}
                  className="flex w-full flex-col rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent-soft/40 disabled:opacity-50"
                >
                  <span className="font-medium text-ink">{c.name}</span>
                  {contactDetail(c) && (
                    <span className="text-[11px] text-muted">{contactDetail(c)}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setQuery("");
            }}
            className="mt-1 text-[11px] text-muted hover:text-ink"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-2 w-full rounded-lg border border-dashed border-border px-3 py-2 text-left text-xs font-medium text-muted hover:border-accent/50 hover:text-accent"
        >
          + Add person
        </button>
      )}
    </section>
  );
}
