"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { TasksProvider, useTasks } from "@/lib/store";
import { SettingsProvider, useSettings } from "@/lib/settings-store";
import { ProjectsProvider } from "@/lib/projects-store";
import { shouldShowUnplannedNudge } from "@/lib/unplanned-nudge";
import { hasDoPlanWithinWeek } from "@/lib/do-plan";
import { useTodayAssignment } from "@/lib/use-today-assignment";
import { useTodayCaptures } from "@/lib/use-today-captures";
import { TodayScreen } from "@/components/today/TodayScreen";
import { TaskDetailSheet } from "@/components/TaskDetailSheet";
import type { Task } from "@/lib/types";

type DemoMode = "mode" | "open";

const DEMO_THEME = "Ship undertow — admin catch-up Thursday";
const DEMO_APPROVED = new Set(["t3", "t5", "t7", "t8", "t15"]);
const DEMO_WEEK_KEY = "2026-07-06";

function TodayDemoInner() {
  const [demo, setDemo] = useState<DemoMode>("mode");
  const [extraApproved, setExtraApproved] = useState<Set<string>>(new Set());
  const { tasks, completeTask, addTask } = useTasks();
  const { addToToday } = useTodayAssignment();
  const { chips: caughtToday, capture: recordCapture } = useTodayCaptures();
  const { lifeAreas, unplannedNudgeDismissedIds, dismissUnplannedNudge } = useSettings();

  const approved = useMemo(
    () => new Set([...DEMO_APPROVED, ...extraApproved]),
    [extraApproved]
  );

  const active = useMemo(() => tasks.filter((t) => t.status !== "done"), [tasks]);

  const modeBench = useMemo(() => {
    if (demo !== "mode") return [];
    return active
      .filter(
        (t) =>
          t.workModeId === "admin" &&
          (approved.has(t.id) || hasDoPlanWithinWeek(t.doPlan, 0))
      )
      .sort((a, b) => (a.deadlineInDays ?? 99) - (b.deadlineInDays ?? 99));
  }, [active, demo, approved]);

  const alsoToday = useMemo(() => {
    if (demo !== "mode") return [];
    return active.filter(
      (t) =>
        t.inToday &&
        t.workModeId !== "admin" &&
        !modeBench.some((m) => m.id === t.id)
    );
  }, [active, demo, modeBench]);

  const openDayTasks = useMemo(() => {
    if (demo !== "open") return [];
    return active.filter((t) => t.inToday);
  }, [active, demo]);

  const lifted = useMemo(() => {
    const fromData = tasks
      .filter((t) => t.status === "done" && (t.completedAtInDays === 0 || t.completedAtInDays === -4))
      .slice(0, 3)
      .map((t, i) => ({
        id: t.id,
        title: t.title,
        timeLabel: ["11:20a", "4:12p", "9:05a"][i] ?? "earlier",
      }));
    if (fromData.length > 0) return fromData;
    return [
      { id: "demo-l1", title: "send stems to nadia", timeLabel: "4:12p" },
      { id: "demo-l2", title: "confirm hotel block", timeLabel: "11:20a" },
    ];
  }, [tasks]);

  const lifeAreaRail = useMemo(
    () =>
      lifeAreas
        .map((a) => ({
          id: a.id,
          name: a.name,
          color: a.color,
          openCount: active.filter((t) => t.lifeAreaId === a.id).length,
        }))
        .filter((a) => a.openCount > 0),
    [lifeAreas, active]
  );

  const unplannedAll = useMemo(() => {
    if (demo !== "mode") return [];
    return active
      .filter(
        (t) =>
          t.workModeId === "admin" &&
          !approved.has(t.id) &&
          !hasDoPlanWithinWeek(t.doPlan, 0)
      )
      .sort((a, b) => (a.deadlineInDays ?? 99) - (b.deadlineInDays ?? 99));
  }, [active, demo, approved]);

  const unplannedVisible = useMemo(() => {
    const ids = unplannedAll.map((t) => t.id);
    const dismissed = unplannedNudgeDismissedIds[DEMO_WEEK_KEY];
    if (!shouldShowUnplannedNudge(ids, dismissed)) return [];
    return unplannedAll;
  }, [unplannedAll, unplannedNudgeDismissedIds]);

  const handleApproveUnplanned = useCallback((taskIds: string[]) => {
    setExtraApproved((prev) => new Set([...prev, ...taskIds]));
  }, []);

  const handleDismissUnplanned = useCallback(() => {
    dismissUnplannedNudge(
      DEMO_WEEK_KEY,
      unplannedAll.map((t) => t.id)
    );
  }, [dismissUnplannedNudge, unplannedAll]);

  const openDayTasksByArea = useMemo(() => {
    const map: Record<string, Task[]> = {};
    const pool = active.filter((t) => !t.inToday);
    for (const t of pool) {
      if (!t.lifeAreaId) continue;
      if (!map[t.lifeAreaId]) map[t.lifeAreaId] = [];
      map[t.lifeAreaId].push(t);
    }
    return map;
  }, [active]);

  const handleCapture = useCallback(
    (text: string) => {
      recordCapture(text);
      addTask(text);
    },
    [recordCapture, addTask]
  );

  const handleAssignOpenDay = useCallback(
    (taskId: string) => {
      addToToday(taskId);
    },
    [addToToday]
  );

  const benchCount =
    demo === "mode" ? modeBench.length + alsoToday.length : openDayTasks.length;

  return (
    <div className="space-y-6 px-6 py-10">
      <header className="mx-auto max-w-5xl">
        <Link href="/design" className="text-sm font-medium text-muted hover:text-accent">
          ← Design lab
        </Link>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">Today — mock</h1>
            <p className="mt-1 text-sm text-muted">Real app styling · sample data · toggle day type</p>
          </div>
          <div className="flex rounded-lg border border-border bg-surface p-0.5 text-sm">
            {(["mode", "open"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setDemo(m)}
                className={[
                  "rounded-md px-4 py-1.5 font-medium capitalize transition-colors",
                  demo === m ? "bg-accent text-white" : "text-muted hover:text-ink",
                ].join(" ")}
              >
                {m} day
              </button>
            ))}
          </div>
        </div>
        <p className="mt-3 text-xs text-muted">
          Live app:{" "}
          <Link href="/today" className="font-medium text-accent hover:underline">
            /today
          </Link>
          {" · "}
          <Link href="/design/today/spec" className="text-accent hover:underline">
            wireframe spec
          </Link>
        </p>
      </header>

      <div className="mx-auto w-full max-w-6xl">
        <TodayScreen
          dateLabel="Thursday · Jul 10"
          benchCount={benchCount}
          liftedCount={lifted.length}
          theme={DEMO_THEME}
          modeDayLabel={demo === "mode" ? "admin day" : null}
          plannedLabel={demo === "mode" ? "you planned this Sunday" : null}
          isOpenDay={demo === "open"}
          modeBench={modeBench}
          alsoToday={alsoToday}
          openDayTasks={openDayTasks}
          lifted={lifted}
          lifeAreas={lifeAreaRail}
          unplannedTasks={unplannedVisible}
          unplannedModeName={demo === "mode" ? "admin" : null}
          onApproveUnplanned={handleApproveUnplanned}
          onDismissUnplanned={handleDismissUnplanned}
          caughtToday={caughtToday}
          onCapture={handleCapture}
          openDayTasksByArea={openDayTasksByArea}
          approvedTaskIds={approved}
          onAssignOpenDay={handleAssignOpenDay}
          onComplete={completeTask}
        />
        <TaskDetailSheet />
      </div>
    </div>
  );
}

export default function TodayDesignPreview() {
  return (
    <SettingsProvider>
      <ProjectsProvider>
        <TasksProvider>
          <TodayDemoInner />
        </TasksProvider>
      </ProjectsProvider>
    </SettingsProvider>
  );
}
