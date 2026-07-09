"use client";

import { WORK_MODES } from "@/lib/sample-data";
import { useProjects } from "@/lib/projects-store";
import { getActiveLifeAreas } from "@/lib/life-area-registry";
import { lifeAreaName, projectName, workModeName } from "@/lib/lenses";
import { DayPlanningPanel } from "@/components/DayPlanningPanel";
import type { AllDayDisposition, DayCommitment } from "@/lib/calendar/types";
import {
  focusLabel,
  type DayFocus,
  type DayShapeBlock,
  type DayShapeIntent,
  type WeekDayFocusEntry,
  type WeekDaySlot,
} from "@/lib/week-focus";
import type { Task } from "@/lib/types";
import type { WeekStartDay } from "@/lib/week";

const BLOCKS: DayShapeBlock[] = ["morning", "afternoon", "evening"];

function intentLabel(intent: DayShapeIntent): string {
  if (intent.kind === "mode") return workModeName(intent.id);
  if (intent.kind === "project") return projectName(intent.id);
  return lifeAreaName(intent.id);
}

export type DayShapePanelProps = {
  slot: WeekDaySlot;
  entry: WeekDayFocusEntry;
  commitment: DayCommitment;
  calendarLoading: boolean;
  calendarError: string | null;
  calendarConnected: boolean;
  allDayDispositions: Record<string, AllDayDisposition>;
  tasks: Task[];
  weekStartsOn: WeekStartDay;
  onFocus: (focus: DayFocus | null) => void;
  onNote: (note: string) => void;
  onAllDayDisposition: (dateKey: string, eventId: string, value: AllDayDisposition) => void;
  onShapeBlock: (block: DayShapeBlock, intent: DayShapeIntent | null) => void;
};

export function DayShapePanel(props: DayShapePanelProps) {
  const { projects } = useProjects();
  const areas = getActiveLifeAreas();
  const { entry, onShapeBlock } = props;

  const morningHint =
    entry.focus && !entry.shapeBlocks?.morning
      ? entry.focus.kind === "mode"
        ? `${workModeName(entry.focus.id).toLowerCase()}?`
        : `${projectName(entry.focus.id)}?`
      : "—";

  return (
    <div className="overflow-hidden rounded-xl border border-accent/25 bg-accent-soft/20">
      <div className="max-h-[min(70dvh,520px)] overflow-y-auto">
        <DayPlanningPanel {...props} />

        <section className="border-t border-line px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-faint">
            Soft timeline · intentions only
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {BLOCKS.map((block) => {
              const intent = entry.shapeBlocks?.[block] ?? null;
              return (
                <div key={block} className="rounded-lg border border-dashed border-border bg-surface p-3">
                  <p className="text-[10px] font-semibold uppercase text-faint">{block}</p>
                  <p className="mt-1 min-h-[1.25rem] text-xs text-muted">
                    {intent ? intentLabel(intent) : block === "morning" ? morningHint : "—"}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {WORK_MODES.map((m) => (
                      <IntentChip
                        key={m.id}
                        label={m.name}
                        active={intent?.kind === "mode" && intent.id === m.id}
                        onClick={() => onShapeBlock(block, { kind: "mode", id: m.id })}
                      />
                    ))}
                    {projects.slice(0, 4).map((p) => (
                      <IntentChip
                        key={p.id}
                        label={p.name}
                        active={intent?.kind === "project" && intent.id === p.id}
                        onClick={() => onShapeBlock(block, { kind: "project", id: p.id })}
                      />
                    ))}
                    {areas.slice(0, 3).map((a) => (
                      <IntentChip
                        key={a.id}
                        label={a.name}
                        active={intent?.kind === "area" && intent.id === a.id}
                        onClick={() => onShapeBlock(block, { kind: "area", id: a.id })}
                      />
                    ))}
                    {intent && (
                      <IntentChip label="Clear" active={false} onClick={() => onShapeBlock(block, null)} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {entry.focus && (
            <p className="mt-2 text-xs text-faint">
              Week plan: {focusLabel(entry.focus)} · blocks are optional intentions, not assignments
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

function IntentChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-md border px-1.5 py-0.5 text-[10px] font-medium transition-colors",
        active
          ? "border-accent bg-accent-soft text-accent"
          : "border-border text-muted hover:border-accent hover:text-ink",
      ].join(" ")}
    >
      {label}
    </button>
  );
}
