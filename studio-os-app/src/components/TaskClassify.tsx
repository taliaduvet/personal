"use client";

import { useEffect, useRef, useState } from "react";
import { PROJECTS, WORK_MODES } from "@/lib/sample-data";
import { classifyChipLabels } from "@/lib/parse";
import { lifeAreaColor, lifeAreaName } from "@/lib/lenses";
import { useSettings } from "@/lib/settings-store";
import { DoPlanCalendar, DeadlineCalendar } from "@/components/DoPlanCalendar";
import type { DoPlan, Task } from "@/lib/types";

type FieldKey = "project" | "doing" | "deadline" | "mode";

type ClassifyTask = Pick<
  Task,
  "projectId" | "lifeAreaId" | "doPlan" | "deadlineInDays" | "workModeId"
>;

/**
 * Compact context row — one pill per field; tap opens a dropdown for just that field.
 */
export function TaskClassifyDropdowns({
  task,
  onChange,
  label = "Context",
}: {
  task: ClassifyTask;
  onChange: (patch: Partial<Task>) => void;
  label?: string;
}) {
  const { weekStartsOn } = useSettings();
  const [open, setOpen] = useState<FieldKey | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const chips = classifyChipLabels(task, weekStartsOn);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const toggle = (field: FieldKey) => setOpen((cur) => (cur === field ? null : field));

  const pickProject = (projectId: string | null) => {
    if (!projectId) onChange({ projectId: null });
    else {
      const p = PROJECTS.find((x) => x.id === projectId);
      if (p) onChange({ projectId: p.id, lifeAreaId: p.lifeAreaId });
    }
    setOpen(null);
  };

  const pickDoing = (plan: DoPlan) => {
    onChange({ doPlan: plan });
    setOpen(null);
  };

  const pickDeadline = (value: number | null) => {
    onChange({ deadlineInDays: value });
    setOpen(null);
  };

  const pickMode = (workModeId: string | null) => {
    onChange({ workModeId });
    setOpen(null);
  };

  return (
    <div ref={rootRef}>
      <p className="text-xs font-semibold uppercase tracking-wide text-faint">{label}</p>

      <div className="mt-2 flex flex-wrap gap-1.5">
        <ContextPill
          active={open === "project"}
          dot={task.projectId ? lifeAreaColor(task.lifeAreaId) : undefined}
          accent={!!task.projectId}
          onClick={() => toggle("project")}
        >
          {chips.project ?? "Project"}
        </ContextPill>

        <ContextPill
          active={open === "doing"}
          onClick={() => toggle("doing")}
          filled={task.doPlan !== null}
        >
          {chips.doing ?? "Doing"}
        </ContextPill>

        <ContextPill
          active={open === "deadline"}
          danger={task.deadlineInDays !== null}
          onClick={() => toggle("deadline")}
        >
          {chips.deadline ?? "Deadline"}
        </ContextPill>

        <ContextPill active={open === "mode"} onClick={() => toggle("mode")} filled={!!task.workModeId}>
          {chips.mode ?? "Mode"}
        </ContextPill>
      </div>

      {open === "project" && (
        <DropdownPanel title="Project">
          {PROJECTS.map((p) => (
            <DropdownOption
              key={p.id}
              selected={task.projectId === p.id}
              dot={lifeAreaColor(p.lifeAreaId)}
              title={p.name}
              subtitle={p.why ?? undefined}
              onClick={() => pickProject(p.id)}
            />
          ))}
          <DropdownOption selected={!task.projectId} dot="#8b95a1" title="None" onClick={() => pickProject(null)} />
        </DropdownPanel>
      )}

      {open === "doing" && (
        <div className="mt-2">
          <DoPlanCalendar
            value={task.doPlan}
            weekStartsOn={weekStartsOn}
            onChange={pickDoing}
          />
        </div>
      )}

      {open === "deadline" && (
        <div className="mt-2">
          <DeadlineCalendar
            deadlineInDays={task.deadlineInDays}
            weekStartsOn={weekStartsOn}
            onChange={pickDeadline}
          />
        </div>
      )}

      {open === "mode" && (
        <DropdownPanel title="Mode">
          {WORK_MODES.map((m) => (
            <DropdownOption
              key={m.id}
              selected={task.workModeId === m.id}
              title={m.name}
              onClick={() => pickMode(m.id)}
            />
          ))}
          <DropdownOption selected={!task.workModeId} title="None" onClick={() => pickMode(null)} />
        </DropdownPanel>
      )}

      {task.projectId && (
        <p className="mt-1.5 text-xs text-faint">{lifeAreaName(task.lifeAreaId)} · inherited from project</p>
      )}
    </div>
  );
}

function ContextPill({
  children,
  onClick,
  active = false,
  dot,
  accent = false,
  danger = false,
  filled = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  dot?: string;
  accent?: boolean;
  danger?: boolean;
  filled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm transition-colors",
        active
          ? "border-accent bg-accent-soft text-accent"
          : danger
            ? "border-danger/30 text-danger hover:border-danger/50"
            : accent
              ? "border-accent/30 text-accent hover:border-accent/50"
              : filled
                ? "border-border bg-canvas text-muted hover:border-accent hover:text-ink"
                : "border-border text-faint hover:border-accent hover:text-muted",
      ].join(" ")}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full" style={{ background: dot }} />}
      {children}
      <Chevron open={active} />
    </button>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={["h-3 w-3 shrink-0 opacity-60 transition-transform", open ? "rotate-180" : ""].join(" ")}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function DropdownPanel({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-2 rounded-xl border border-border bg-surface p-2 shadow-sm">
      <p className="px-2 text-[10px] font-semibold uppercase tracking-wide text-faint">{title}</p>
      {hint && <p className="px-2 pb-1 text-[11px] text-muted">{hint}</p>}
      <ul className="mt-1 space-y-1">{children}</ul>
    </div>
  );
}

function DropdownOption({
  title,
  subtitle,
  selected,
  dot,
  danger = false,
  onClick,
}: {
  title: string;
  subtitle?: string;
  selected: boolean;
  dot?: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={[
          "flex w-full items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-colors",
          selected
            ? danger
              ? "border-danger/40 bg-danger/5"
              : "border-accent/40 bg-accent-soft/60"
            : "border-transparent hover:border-border hover:bg-canvas",
        ].join(" ")}
      >
        {dot && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: dot }} />}
        <span className="min-w-0 flex-1">
          <span className={["block text-sm font-medium", danger && selected ? "text-danger" : "text-ink"].join(" ")}>
            {title}
          </span>
          {subtitle && <span className="mt-0.5 block text-xs leading-relaxed text-muted">{subtitle}</span>}
        </span>
        {selected && (
          <svg viewBox="0 0 24 24" className={["mt-0.5 h-4 w-4 shrink-0", danger ? "text-danger" : "text-accent"].join(" ")} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="m5 13 4 4L19 7" />
          </svg>
        )}
      </button>
    </li>
  );
}
