/**
 * DESIGN HANDOFF — Task Work View (full page)
 * -------------------------------------------
 * This is NOT the quick-edit sheet. Two distinct surfaces:
 *
 * QUICK EDIT (TaskDetailSheet.tsx — bottom sheet)
 *   Purpose:  Fast filing while browsing — assign project, dates, Today, mode.
 *   Trigger:  Tap the meta row / edit icon on a card, or "Sort" from Inbox.
 *   Stays:    Overlay; dismiss in one tap; never leaves the list.
 *   Has:      Chips for project · area · mode · dates · Today · done/delete.
 *   No:       Why panel, sub-tasks, notes.
 *
 * WORK VIEW (this file — full page at /tasks/[id])
 *   Purpose:  Actually work on the task — context, steps, notes.
 *   Trigger:  Tap the task title (primary tap on card).
 *   Stays:    Navigates to a page; back returns to where you were.
 *   Has:      Title, project why, sub-tasks, notes, full context.
 *   Light:    Metadata editable here too, but secondary to the work area.
 *
 * Self-contained mock — not wired into the app yet.
 */

"use client";

import { useState } from "react";

// ── Mock data (replace with real store when implementing) ──────────────────

const LIFE_AREAS = [
  { id: "music", name: "Music", color: "#5b61e8" },
  { id: "income", name: "Income", color: "#3c8262" },
  { id: "health", name: "Health", color: "#bc6740" },
];

const PROJECTS = [
  { id: "factor-grant", name: "FACTOR Grant", lifeAreaId: "music", why: "Fund the next record without going into debt." },
  { id: "spring-ep", name: "Spring EP", lifeAreaId: "music", why: "Put the body of work I'm proudest of into the world." },
];

const WORK_MODES = [
  { id: "admin", name: "Admin" },
  { id: "creative", name: "Creative" },
  { id: "outreach", name: "Outreach" },
  { id: "errands", name: "Errands" },
];

const MOCK_TASK = {
  id: "t6",
  title: "Finish grant narrative",
  lifeAreaId: "music",
  projectId: "factor-grant",
  workModeId: "creative",
  doDateInDays: 0,
  deadlineInDays: 1,
  status: "in_progress" as const,
  inToday: true,
  notes: "Need to mention the community workshop series and touring plan. Budget section is mostly done.",
  subtasks: [
    { id: "s1", title: "Draft opening paragraph", done: true },
    { id: "s2", title: "Write budget justification", done: false },
    { id: "s3", title: "Get second pair of eyes on it", done: false },
  ],
};

const DO_OPTIONS = [
  { label: "Today", value: 0 },
  { label: "Tomorrow", value: 1 },
  { label: "In 3 days", value: 3 },
  { label: "Next week", value: 7 },
  { label: "Someday", value: null },
];

const DEADLINE_OPTIONS = [
  { label: "None", value: null },
  { label: "Today", value: 0 },
  { label: "In 3 days", value: 3 },
  { label: "In a week", value: 7 },
];

// ── Component ──────────────────────────────────────────────────────────────

export default function TaskOpenViewDesign() {
  const [task, setTask] = useState(MOCK_TASK);
  const [newSubtask, setNewSubtask] = useState("");

  const project = PROJECTS.find((p) => p.id === task.projectId);
  const area = LIFE_AREAS.find((a) => a.id === task.lifeAreaId);
  const doneCount = task.subtasks.filter((s) => s.done).length;

  return (
    <div className="min-h-dvh bg-canvas">
      {/* ── Top bar ── */}
      <header className="sticky top-0 z-10 border-b border-line bg-surface/95 px-4 py-3 backdrop-blur-sm md:px-8">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <button type="button" className="text-sm font-medium text-muted hover:text-ink">
            ← Back
          </button>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted">
            {area && <span className="h-2 w-2 rounded-full" style={{ background: area.color }} />}
            {task.status === "in_progress" ? "In progress" : "Task"}
          </span>
          <button type="button" className="text-sm font-medium text-danger hover:text-danger/80">
            Delete
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 md:px-8">
        {/* ── Title ── */}
        <textarea
          value={task.title}
          onChange={(e) => setTask({ ...task, title: e.target.value })}
          rows={2}
          className="w-full resize-none bg-transparent font-display text-2xl font-semibold tracking-tight text-ink outline-none placeholder:text-faint"
          placeholder="Task title"
        />

        {/* ── Project context + WHY (the goal lives here) ── */}
        {project && (
          <section className="mt-5 rounded-xl border border-border bg-accent-soft/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-faint">Working toward</p>
            <p className="mt-1 font-display text-base font-semibold text-ink">{project.name}</p>
            {project.why && (
              <p className="mt-2 text-sm leading-relaxed text-muted">&ldquo;{project.why}&rdquo;</p>
            )}
          </section>
        )}

        {/* ── Metadata row: project · area · mode · today ── */}
        <section className="mt-6 space-y-5">
          <Field label="Project">
            <ChipRow>
              {PROJECTS.map((p) => (
                <Chip key={p.id} selected={task.projectId === p.id} dot={LIFE_AREAS.find((a) => a.id === p.lifeAreaId)?.color}>
                  {p.name}
                </Chip>
              ))}
              <Chip selected={!task.projectId}>None</Chip>
            </ChipRow>
          </Field>

          <Field label="Life area">
            <ChipRow>
              {LIFE_AREAS.map((a) => (
                <Chip key={a.id} selected={task.lifeAreaId === a.id} dot={a.color}>
                  {a.name}
                </Chip>
              ))}
            </ChipRow>
          </Field>

          <Field label="Work mode">
            <ChipRow>
              {WORK_MODES.map((m) => (
                <Chip key={m.id} selected={task.workModeId === m.id}>
                  {m.name}
                </Chip>
              ))}
              <Chip selected={!task.workModeId}>None</Chip>
            </ChipRow>
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Doing date" hint="Soft plan — never overdue guilt.">
              <ChipRow>
                {DO_OPTIONS.map((o) => (
                  <Chip key={o.label} selected={task.doDateInDays === o.value}>
                    {o.label}
                  </Chip>
                ))}
              </ChipRow>
            </Field>

            <Field label="Hard deadline" hint="External only.">
              <ChipRow>
                {DEADLINE_OPTIONS.map((o) => (
                  <Chip key={o.label} selected={task.deadlineInDays === o.value} danger={o.value !== null}>
                    {o.label}
                  </Chip>
                ))}
              </ChipRow>
            </Field>
          </div>

          <button
            type="button"
            className={[
              "rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
              task.inToday
                ? "bg-accent text-white"
                : "border border-border text-muted hover:border-accent hover:text-accent",
            ].join(" ")}
          >
            {task.inToday ? "In Today" : "Add to Today"}
          </button>
        </section>

        {/* ── Sub-tasks ── */}
        <section className="mt-8">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-base font-semibold text-ink">Sub-tasks</h2>
            <span className="text-xs text-muted">
              {doneCount}/{task.subtasks.length} done
            </span>
          </div>
          <ul className="mt-3 space-y-1">
            {task.subtasks.map((s) => (
              <li key={s.id} className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2.5">
                <button
                  type="button"
                  aria-label={s.done ? "Mark incomplete" : "Mark complete"}
                  className={[
                    "h-4 w-4 shrink-0 rounded-full border-2 transition-colors",
                    s.done ? "border-accent bg-accent" : "border-faint hover:border-accent",
                  ].join(" ")}
                />
                <span className={["flex-1 text-sm", s.done ? "text-faint line-through" : "text-ink"].join(" ")}>
                  {s.title}
                </span>
              </li>
            ))}
          </ul>
          <form
            className="mt-2 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!newSubtask.trim()) return;
              setTask({
                ...task,
                subtasks: [...task.subtasks, { id: `s-${Date.now()}`, title: newSubtask.trim(), done: false }],
              });
              setNewSubtask("");
            }}
          >
            <input
              value={newSubtask}
              onChange={(e) => setNewSubtask(e.target.value)}
              placeholder="Add a step…"
              className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none placeholder:text-faint focus:border-accent"
            />
            <button type="submit" className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-ink">
              Add
            </button>
          </form>
        </section>

        {/* ── Notes ── */}
        <section className="mt-8">
          <h2 className="font-display text-base font-semibold text-ink">Notes</h2>
          <p className="mt-0.5 text-xs text-muted">Links, context, drafts — anything that helps when you come back.</p>
          <textarea
            value={task.notes}
            onChange={(e) => setTask({ ...task, notes: e.target.value })}
            rows={5}
            placeholder="Jot something down…"
            className="mt-3 w-full resize-y rounded-xl border border-border bg-surface px-4 py-3 text-sm leading-relaxed text-ink outline-none placeholder:text-faint focus:border-accent"
          />
        </section>
      </main>

      {/* ── Sticky footer ── */}
      <footer className="sticky bottom-0 border-t border-line bg-surface px-4 py-4 md:px-8">
        <div className="mx-auto flex max-w-2xl justify-end">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-medium text-white hover:bg-accent-ink"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="m5 13 4 4L19 7" />
            </svg>
            Mark done
          </button>
        </div>
      </footer>
    </div>
  );
}

// ── Primitives (restyle these) ─────────────────────────────────────────────

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-faint">{label}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
      <div className="mt-2">{children}</div>
    </div>
  );
}

function ChipRow({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-1.5">{children}</div>;
}

function Chip({
  children,
  selected = false,
  dot,
  danger = false,
}: {
  children: React.ReactNode;
  selected?: boolean;
  dot?: string;
  danger?: boolean;
}) {
  const base = "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm transition-colors";
  const tone = selected
    ? danger ? "bg-danger text-white" : "bg-accent text-white"
    : "border border-border text-muted hover:border-accent hover:text-ink";
  return (
    <button type="button" className={[base, tone].join(" ")}>
      {dot && <span className="h-1.5 w-1.5 rounded-full" style={{ background: selected ? "currentColor" : dot }} />}
      {children}
    </button>
  );
}
