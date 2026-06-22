"use client";

import { PROJECTS, WORK_MODES } from "@/lib/sample-data";
import { classifyChipLabels } from "@/lib/parse";
import { lifeAreaColor, lifeAreaName } from "@/lib/lenses";
import type { Task } from "@/lib/types";

/** Read-only context tags for Work View — tap opens Quick Edit. */
export function TaskContextTags({
  task,
  onEdit,
}: {
  task: Pick<Task, "projectId" | "doDateInDays" | "deadlineInDays" | "workModeId" | "lifeAreaId">;
  onEdit: () => void;
}) {
  const chips = classifyChipLabels(task);
  const hasAny = chips.project || chips.doing || chips.deadline || chips.mode;

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-faint">Context</p>
      <button
        type="button"
        onClick={onEdit}
        className="mt-2 flex w-full flex-wrap items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2.5 text-left transition-colors hover:border-accent"
      >
        {chips.project && (
          <Tag dot={lifeAreaColor(task.lifeAreaId)} accent>
            {chips.project}
          </Tag>
        )}
        {chips.doing && <Tag>{chips.doing}</Tag>}
        {chips.deadline && <Tag danger>{chips.deadline}</Tag>}
        {chips.mode && <Tag>{chips.mode}</Tag>}
        {!hasAny && <span className="text-sm text-faint">Tap to classify…</span>}
        {!task.projectId && task.lifeAreaId && (
          <span className="text-xs text-faint">· {lifeAreaName(task.lifeAreaId)}</span>
        )}
      </button>
    </div>
  );
}

function Tag({
  children,
  dot,
  accent = false,
  danger = false,
}: {
  children: React.ReactNode;
  dot?: string;
  accent?: boolean;
  danger?: boolean;
}) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        danger ? "bg-danger/10 text-danger" : accent ? "bg-accent-soft text-accent" : "bg-canvas text-muted",
      ].join(" ")}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full" style={{ background: dot }} />}
      {children}
    </span>
  );
}

export const DO_OPTIONS: { label: string; value: number | null }[] = [
  { label: "Today", value: 0 },
  { label: "Tomorrow", value: 1 },
  { label: "In 3 days", value: 3 },
  { label: "Next week", value: 7 },
  { label: "Someday", value: null },
];

export const DEADLINE_OPTIONS: { label: string; value: number | null }[] = [
  { label: "None", value: null },
  { label: "Today", value: 0 },
  { label: "In 3 days", value: 3 },
  { label: "In a week", value: 7 },
];

export function ClassifyEditor({
  task,
  onChange,
}: {
  task: Task;
  onChange: (patch: Partial<Task>) => void;
}) {
  const pickProject = (projectId: string | null) => {
    if (!projectId) {
      onChange({ projectId: null });
      return;
    }
    const p = PROJECTS.find((x) => x.id === projectId);
    if (!p) return;
    onChange({ projectId: p.id, lifeAreaId: p.lifeAreaId });
  };

  return (
    <div className="space-y-3">
      <ChipRow label="Project">
        {PROJECTS.map((p) => (
          <Chip key={p.id} selected={task.projectId === p.id} dot={lifeAreaColor(p.lifeAreaId)} onClick={() => pickProject(p.id)}>
            {p.name}
          </Chip>
        ))}
        <Chip selected={!task.projectId} onClick={() => pickProject(null)}>None</Chip>
      </ChipRow>
      <ChipRow label="Doing">
        {DO_OPTIONS.map((o) => (
          <Chip key={o.label} selected={task.doDateInDays === o.value} onClick={() => onChange({ doDateInDays: o.value })}>
            {o.label}
          </Chip>
        ))}
      </ChipRow>
      <ChipRow label="Deadline">
        {DEADLINE_OPTIONS.map((o) => (
          <Chip key={o.label} selected={task.deadlineInDays === o.value} danger={o.value !== null} onClick={() => onChange({ deadlineInDays: o.value })}>
            {o.label}
          </Chip>
        ))}
      </ChipRow>
      <ChipRow label="Mode">
        {WORK_MODES.map((m) => (
          <Chip key={m.id} selected={task.workModeId === m.id} onClick={() => onChange({ workModeId: m.id })}>
            {m.name}
          </Chip>
        ))}
        <Chip selected={!task.workModeId} onClick={() => onChange({ workModeId: null })}>None</Chip>
      </ChipRow>
      {task.projectId && (
        <p className="text-xs text-faint">Life area: {lifeAreaName(task.lifeAreaId)} (from project)</p>
      )}
    </div>
  );
}

function ChipRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-faint">{label}</p>
      <div className="mt-1 flex flex-wrap gap-1">{children}</div>
    </div>
  );
}

function Chip({
  children,
  selected,
  onClick,
  dot,
  danger = false,
}: {
  children: React.ReactNode;
  selected: boolean;
  onClick: () => void;
  dot?: string;
  danger?: boolean;
}) {
  const tone = selected
    ? danger ? "bg-danger text-white" : "bg-accent text-white"
    : "border border-border text-muted hover:border-accent";
  return (
    <button type="button" onClick={onClick} className={["inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition-colors", tone].join(" ")}>
      {dot && <span className="h-1 w-1 rounded-full" style={{ background: selected ? "currentColor" : dot }} />}
      {children}
    </button>
  );
}
