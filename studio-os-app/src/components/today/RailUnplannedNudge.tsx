"use client";

import { useEffect, useState } from "react";
import type { Task } from "@/lib/types";

export type RailUnplannedNudgeProps = {
  tasks: Task[];
  modeName: string;
  onApproveSelected: (taskIds: string[]) => void;
  onDismiss: () => void;
};

export function RailUnplannedNudge({
  tasks,
  modeName,
  onApproveSelected,
  onDismiss,
}: RailUnplannedNudgeProps) {
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    setSelected((prev) => {
      const next = new Set<string>();
      for (const id of prev) {
        if (tasks.some((t) => t.id === id)) next.add(id);
      }
      return next;
    });
  }, [tasks]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const approveSelected = () => {
    if (selected.size === 0) return;
    onApproveSelected([...selected]);
    setSelected(new Set());
    if (tasks.length <= selected.size) setExpanded(false);
  };

  return (
    <div className="rounded-lg border border-accent/30 bg-surface text-xs">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2.5 text-left text-ink"
      >
        <span>
          <strong>{tasks.length}</strong> {modeName} task{tasks.length !== 1 ? "s" : ""} not in plan
        </span>
        <span className="text-faint">{expanded ? "▴" : "▾"}</span>
      </button>

      {expanded ? (
        <div className="space-y-2 border-t border-line px-3 pb-3 pt-2">
          <p className="text-[10px] text-muted">Approve to add to today&apos;s bench</p>
          <ul className="space-y-1.5">
            {tasks.map((task) => (
              <li key={task.id} className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={selected.has(task.id)}
                  onChange={() => toggle(task.id)}
                  className="mt-0.5 rounded border-border"
                  aria-label={`Approve ${task.title} for this week`}
                />
                <span className="min-w-0 flex-1 truncate text-ink">{task.title}</span>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-1.5 border-t border-line pt-2">
            <button
              type="button"
              onClick={approveSelected}
              disabled={selected.size === 0}
              className="rounded-md bg-accent px-2 py-0.5 text-[10px] font-medium text-white disabled:opacity-40"
            >
              approve selected{selected.size > 0 ? ` (${selected.size})` : ""}
            </button>
            <button
              type="button"
              onClick={() => {
                onDismiss();
                setExpanded(false);
              }}
              className="rounded-md border border-border px-2 py-0.5 text-[10px] text-muted hover:text-ink"
            >
              dismiss
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
