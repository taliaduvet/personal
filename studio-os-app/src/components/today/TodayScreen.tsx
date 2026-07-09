"use client";

import { useState } from "react";
import Link from "next/link";
import type { Task } from "@/lib/types";
import { TaskCard } from "@/components/TaskCard";
import { RailUnplannedNudge } from "@/components/today/RailUnplannedNudge";
import { OpenDayAreaPicker } from "@/components/today/OpenDayAreaPicker";
import { DayShapePanel, type DayShapePanelProps } from "@/components/today/DayShapePanel";

export type LiftedItem = { id: string; title: string; timeLabel: string };

export type LifeAreaRailItem = {
  id: string;
  name: string;
  color: string;
  openCount: number;
};

export type TodayScreenProps = {
  dateLabel: string;
  benchCount: number;
  liftedCount: number;
  theme: string | null;
  modeDayLabel: string | null;
  plannedLabel: string | null;
  isOpenDay: boolean;
  modeBench: Task[];
  alsoToday: Task[];
  openDayTasks: Task[];
  lifted: LiftedItem[];
  lifeAreas: LifeAreaRailItem[];
  unplannedTasks?: Task[];
  unplannedModeName?: string | null;
  onApproveUnplanned?: (taskIds: string[]) => void;
  onDismissUnplanned?: () => void;
  caughtToday?: string[];
  onCapture?: (text: string) => void;
  openDayTasksByArea?: Record<string, Task[]>;
  approvedTaskIds?: Set<string>;
  onAssignOpenDay?: (taskId: string) => void;
  onComplete?: (id: string) => void;
  shapeOpen?: boolean;
  onShapeOpenChange?: (open: boolean) => void;
  dayShape?: DayShapePanelProps | null;
};

function SectionHead({
  title,
  count,
  subtitle,
  dashed,
}: {
  title: string;
  count?: number;
  subtitle?: string;
  dashed?: boolean;
}) {
  return (
    <div className={dashed ? "border-t border-dashed border-border pt-4" : ""}>
      <div className="mb-2.5">
        <h2 className="font-display text-sm font-semibold text-ink">
          {title}
          {count !== undefined ? (
            <span className="ml-1.5 font-normal tabular-nums text-faint">{count}</span>
          ) : null}
        </h2>
        {subtitle ? <p className="mt-0.5 text-xs text-muted">{subtitle}</p> : null}
      </div>
    </div>
  );
}

function CaptureFooter({
  caughtToday = [],
  onCapture,
}: {
  caughtToday?: string[];
  onCapture?: (text: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

  const submit = () => {
    const v = text.trim();
    if (!v || !onCapture) return;
    onCapture(v);
    setText("");
    setOpen(false);
  };

  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        {open ? (
          <form
            className="flex min-w-[12rem] flex-1 gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              autoFocus
              placeholder="capture a thought…"
              aria-label="Capture a thought"
              className="min-w-0 flex-1 rounded-lg border border-border bg-canvas/50 px-3 py-2 text-sm text-ink outline-none placeholder:text-faint focus:border-accent"
            />
            <button
              type="submit"
              disabled={!text.trim()}
              className="shrink-0 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              Add
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex min-w-[12rem] flex-1 items-center gap-2 rounded-lg border border-dashed border-faint/80 bg-canvas/50 px-3 py-2.5 text-left transition-colors hover:border-accent/40 hover:bg-accent-soft/30"
          >
            <span className="text-lg leading-none text-accent">＋</span>
            <span className="text-sm text-muted">capture a thought…</span>
          </button>
        )}
        {caughtToday.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-faint">caught</span>
            {caughtToday.map((chip) => (
              <span
                key={chip}
                className="rounded-full bg-canvas px-2.5 py-0.5 text-[11px] text-muted"
              >
                {chip}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RailLifted({ items }: { items: LiftedItem[] }) {
  const [open, setOpen] = useState(items.length <= 2);
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="text-xs font-semibold text-ink">Lifted today</span>
        <span className="text-xs text-accent">✦ {items.length}</span>
      </button>
      {items.length === 0 ? (
        <p className="mt-2 text-[11px] text-faint">Nothing shipped yet — lifts show here</p>
      ) : open ? (
        <ul className="mt-2 space-y-1.5 border-t border-line pt-2">
          {items.map((item) => (
            <li key={item.id} className="flex items-baseline justify-between gap-2 text-xs">
              <span className="truncate text-muted line-through">{item.title}</span>
              <span className="shrink-0 text-faint">{item.timeLabel}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-[11px] text-faint">tap to expand</p>
      )}
    </div>
  );
}

function RailLifeAreas({
  areas,
  onSelectArea,
}: {
  areas: LifeAreaRailItem[];
  onSelectArea: (area: LifeAreaRailItem) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-faint">Add from area</p>
      {areas.map((a) => (
        <button
          key={a.id}
          type="button"
          onClick={() => onSelectArea(a)}
          className="flex w-full items-center gap-2.5 rounded-lg border border-border bg-surface px-3 py-2 text-left transition-colors hover:border-accent/40"
        >
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: a.color }} />
          <span className="text-sm font-medium text-ink">{a.name}</span>
          <span className="ml-auto text-xs tabular-nums text-muted">{a.openCount}</span>
        </button>
      ))}
      <p className="text-[10px] text-faint">approved this week shown first in picker</p>
    </div>
  );
}

export function TodayScreen({
  dateLabel,
  benchCount,
  liftedCount,
  theme,
  modeDayLabel,
  plannedLabel,
  isOpenDay,
  modeBench,
  alsoToday,
  openDayTasks,
  lifted,
  lifeAreas,
  unplannedTasks,
  unplannedModeName,
  onApproveUnplanned,
  onDismissUnplanned,
  caughtToday,
  onCapture,
  openDayTasksByArea,
  approvedTaskIds,
  onAssignOpenDay,
  onComplete,
  shapeOpen: shapeOpenProp,
  onShapeOpenChange,
  dayShape,
}: TodayScreenProps) {
  const [shapeOpenLocal, setShapeOpenLocal] = useState(false);
  const shapeOpen = shapeOpenProp ?? shapeOpenLocal;
  const setShapeOpen = onShapeOpenChange ?? setShapeOpenLocal;
  const [pickerArea, setPickerArea] = useState<LifeAreaRailItem | null>(null);
  const mainTasks = isOpenDay ? openDayTasks : modeBench;
  const mainTitle = isOpenDay ? "Today" : modeDayLabel?.replace(" day", "") ?? "Today";
  const mainSubtitle = isOpenDay
    ? "Assigned for today"
    : "Approved or doing this week · matching today's mode";

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-baseline gap-3">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">Today</h1>
            <span className="text-sm text-muted">
              {benchCount} on bench · {liftedCount} lifted
            </span>
          </div>
          <p className="mt-0.5 text-sm text-muted">{dateLabel}</p>
          {theme ? <p className="mt-2 text-sm font-medium text-accent">✦ {theme}</p> : null}
          {modeDayLabel && plannedLabel ? (
            <p className="mt-1 text-sm text-muted">
              <span className="font-medium text-ink">{modeDayLabel}</span>
              {" — "}
              {plannedLabel}
            </p>
          ) : isOpenDay ? (
            <p className="mt-1 text-sm italic text-faint">open day — pick from your areas</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setShapeOpen(!shapeOpen)}
          className={[
            "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
            shapeOpen
              ? "border-accent bg-accent-soft text-accent"
              : "border-border bg-surface text-muted hover:text-ink",
          ].join(" ")}
        >
          shape today {shapeOpen ? "▴" : "▾"}
        </button>
      </header>

      {shapeOpen && dayShape ? <DayShapePanel {...dayShape} /> : null}

      {/* Collapsed day-shape strip (dots on a thin line) — design target only.
          See DayShapeCollapsedStrip.design.tsx + BUILD_ROADMAP Phase 2 deferrals. */}

      {/* Split desk — grid so rail runs full height beside the whole bench */}
      <div className="overflow-hidden rounded-xl border border-border shadow-sm min-[560px]:grid min-[560px]:grid-cols-[minmax(0,1fr)_minmax(248px,300px)]">
        <main className="min-w-0 space-y-4 bg-surface p-4 min-[560px]:border-r min-[560px]:border-border">
          {mainTasks.length > 0 || (!isOpenDay && alsoToday.length > 0) ? (
            <>
              <SectionHead title={mainTitle} count={mainTasks.length} subtitle={mainSubtitle} />
              <div className="space-y-2">
                {mainTasks.map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    onComplete={onComplete}
                    hideProject
                    hideMode={!isOpenDay}
                    hideArea={!isOpenDay}
                    todayTiming={!isOpenDay}
                  />
                ))}
              </div>

              {!isOpenDay && alsoToday.length > 0 && (
                <>
                  <SectionHead
                    title="Also today"
                    count={alsoToday.length}
                    subtitle="Assigned outside today's mode"
                    dashed
                  />
                  <div className="space-y-2 rounded-lg border border-dashed border-faint/70 bg-canvas/30 p-2">
                    {alsoToday.map((t) => (
                      <TaskCard
                        key={t.id}
                        task={t}
                        onComplete={onComplete}
                        hideProject
                        hideArea
                        todayTiming
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="py-8 text-center">
              <p className="font-display text-lg font-semibold text-ink">Nothing on the bench yet</p>
              <p className="mt-1 text-sm text-muted">
                {isOpenDay
                  ? "Pick a life area in the rail → or pull from the Lot."
                  : "No approved tasks in today's mode — check also today or replan."}
              </p>
            </div>
          )}
        </main>

        <aside className="flex min-h-full flex-col gap-3 border-t border-border bg-[#e6eaee] p-4 min-[560px]:border-t-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-faint">Context</p>

          {isOpenDay && lifeAreas.length > 0 ? (
            <RailLifeAreas areas={lifeAreas} onSelectArea={setPickerArea} />
          ) : isOpenDay ? (
            <p className="text-xs text-muted">No life areas with open tasks.</p>
          ) : null}

          {!isOpenDay && unplannedTasks && unplannedTasks.length > 0 && unplannedModeName ? (
            <RailUnplannedNudge
              tasks={unplannedTasks}
              modeName={unplannedModeName}
              onApproveSelected={(ids) => onApproveUnplanned?.(ids)}
              onDismiss={() => onDismissUnplanned?.()}
            />
          ) : null}

          <RailLifted items={lifted} />

          <div className="mt-auto pt-1">
            <Link
              href="/tasks"
              className="block rounded-lg border border-dashed border-faint bg-surface px-3 py-2 text-center text-xs font-medium text-muted hover:border-accent hover:text-accent"
            >
              Open the Lot →
            </Link>
          </div>
        </aside>
      </div>

      <CaptureFooter caughtToday={caughtToday} onCapture={onCapture} />

      {pickerArea && openDayTasksByArea && approvedTaskIds && onAssignOpenDay ? (
        <OpenDayAreaPicker
          area={pickerArea}
          tasks={openDayTasksByArea[pickerArea.id] ?? []}
          approvedIds={approvedTaskIds}
          onAssign={(id) => {
            onAssignOpenDay(id);
            setPickerArea(null);
          }}
          onClose={() => setPickerArea(null)}
        />
      ) : null}
    </div>
  );
}
