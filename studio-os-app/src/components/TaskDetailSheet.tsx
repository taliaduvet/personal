"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTasks } from "@/lib/store";
import { useSettings } from "@/lib/settings-store";
import { useTodayAssignment } from "@/lib/use-today-assignment";
import { parseTaskTitle, taskWithCaptureParse } from "@/lib/parse";
import { doPlanEquals } from "@/lib/do-plan";
import { lifeAreaColor } from "@/lib/lenses";
import { weekKey } from "@/lib/week";
import { isTodayPath, openTaskWork } from "@/lib/navigation";
import { TaskClassifyDropdowns } from "@/components/TaskClassify";
import type { Task } from "@/lib/types";

type ClassifyField = "projectId" | "workModeId" | "doPlan" | "deadlineInDays";

/**
 * QUICK EDIT — bottom sheet for fast filing while browsing.
 * Capture mode (New / Inbox add): live smart parse, Enter to confirm.
 * Work View is the full page at /tasks/[id].
 */
export function TaskDetailSheet() {
  const {
    tasks,
    quickEditId,
    quickEditCapture,
    captureDraft,
    closeQuickEdit,
    updateTask,
    deleteTask,
    completeTask,
  } = useTasks();
  const router = useRouter();
  const { weekStartsOn, weekPlanning, setTaskApprovedForWeek } = useSettings();
  const { toggleToday } = useTodayAssignment();
  const pathname = usePathname();
  const onTodayPage = isTodayPath(pathname);
  const weekKeyNow = weekKey(weekStartsOn, 0);
  const weekPlan = weekPlanning[weekKeyNow];
  const [draftTitle, setDraftTitle] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);
  const manualClassify = useRef(new Set<ClassifyField>());
  const task = quickEditId ? tasks.find((t) => t.id === quickEditId) ?? null : null;
  const isApprovedForWeek = Boolean(task && weekPlan?.approvedTaskIds.includes(task.id));
  const taskRef = useRef(task);
  taskRef.current = task;
  const isCapture = quickEditCapture && task !== null;
  const captureText = isCapture ? (draftTitle || captureDraft || "") : task?.title ?? "";
  /** On Today, bench tasks are already approved or assigned — only capture needs today actions. */
  const showTodayActions = !onTodayPage || isCapture;

  const confirmCapture = useCallback(() => {
    if (!task) return;
    const raw = (draftTitle || captureDraft || "").trim();
    const parsed = parseTaskTitle(raw, weekStartsOn);
    if (!parsed.title.trim()) {
      deleteTask(task.id);
      return;
    }
    updateTask(task.id, {
      title: parsed.title,
      projectId: parsed.projectId,
      lifeAreaId: parsed.lifeAreaId,
      workModeId: parsed.workModeId,
      doPlan: parsed.doPlan,
      deadlineInDays: parsed.deadlineInDays,
    });
    closeQuickEdit();
  }, [task, draftTitle, captureDraft, weekStartsOn, updateTask, deleteTask, closeQuickEdit]);

  const abandonCapture = useCallback(() => {
    if (!task) return;
    deleteTask(task.id);
  }, [task, deleteTask]);

  const handleClose = useCallback(() => {
    if (isCapture) {
      const raw = (draftTitle || captureDraft || "").trim();
      if (!raw) {
        abandonCapture();
      } else {
        confirmCapture();
      }
      return;
    }
    closeQuickEdit();
  }, [isCapture, draftTitle, captureDraft, abandonCapture, confirmCapture, closeQuickEdit]);

  const handleCloseRef = useRef(handleClose);
  handleCloseRef.current = handleClose;

  useEffect(() => {
    if (!task) return;
    manualClassify.current = new Set();
    if (quickEditCapture && captureDraft != null) {
      setDraftTitle(captureDraft);
    } else if (!quickEditCapture) {
      setDraftTitle(task.title);
    }
    titleRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleCloseRef.current();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [task?.id, quickEditCapture, captureDraft, task?.title]);

  const classifyTask = useMemo(() => {
    if (!task) return null;
    if (!isCapture) return task;
    const text = captureText.trim();
    if (!text) return task;
    return taskWithCaptureParse(task, text, weekStartsOn, manualClassify.current);
  }, [task, isCapture, captureText, weekStartsOn]);

  useEffect(() => {
    if (!isCapture || !quickEditId || !classifyTask) return;
    const current = taskRef.current;
    if (!current) return;
    const patch: Partial<Task> = {};
    if (!manualClassify.current.has("projectId")) {
      if (current.projectId !== classifyTask.projectId || current.lifeAreaId !== classifyTask.lifeAreaId) {
        patch.projectId = classifyTask.projectId;
        patch.lifeAreaId = classifyTask.lifeAreaId;
      }
    }
    if (!manualClassify.current.has("workModeId") && current.workModeId !== classifyTask.workModeId) {
      patch.workModeId = classifyTask.workModeId;
    }
    if (!manualClassify.current.has("doPlan") && !doPlanEquals(current.doPlan, classifyTask.doPlan)) {
      patch.doPlan = classifyTask.doPlan;
    }
    if (
      !manualClassify.current.has("deadlineInDays") &&
      current.deadlineInDays !== classifyTask.deadlineInDays
    ) {
      patch.deadlineInDays = classifyTask.deadlineInDays;
    }
    if (Object.keys(patch).length > 0) updateTask(quickEditId, patch);
  }, [classifyTask, isCapture, quickEditId, updateTask]);

  if (!task || !classifyTask) return null;

  const set = (patch: Partial<Task>) => updateTask(task.id, patch);

  const setClassify = (patch: Partial<Task>) => {
    if ("projectId" in patch || "lifeAreaId" in patch) manualClassify.current.add("projectId");
    if ("workModeId" in patch) manualClassify.current.add("workModeId");
    if ("doPlan" in patch) manualClassify.current.add("doPlan");
    if ("deadlineInDays" in patch) manualClassify.current.add("deadlineInDays");
    set(patch);
  };

  const done = task.status === "done";
  const chipAreaColor = lifeAreaColor(task.lifeAreaId);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/30 p-0 sm:items-center sm:p-4"
      onClick={handleClose}
      role="presentation"
    >
      <div
        className="flex max-h-[85dvh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-surface shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={isCapture ? "Capture task" : "Quick edit task"}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted">
            <span className="h-2 w-2 rounded-full" style={{ background: chipAreaColor }} />
            {isCapture ? "Capture" : done ? "Completed" : task.status === "in_progress" ? "In progress" : "Task"}
          </span>
          <button type="button" onClick={handleClose} aria-label="Close" className="grid h-7 w-7 place-items-center rounded-full text-muted hover:bg-canvas hover:text-ink">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          <div>
            <input
              ref={titleRef}
              value={isCapture ? captureText : task.title}
              onChange={(e) => {
                if (isCapture) setDraftTitle(e.target.value);
                else set({ title: e.target.value });
              }}
              onKeyDown={(e) => {
                if (isCapture && e.key === "Enter") {
                  e.preventDefault();
                  confirmCapture();
                }
              }}
              aria-label="Task title"
              placeholder={
                isCapture
                  ? "Try \"Email venues tomorrow\" or \"FACTOR grant due Friday\""
                  : "What needs doing?"
              }
              className="w-full bg-transparent font-display text-xl font-semibold text-ink outline-none placeholder:text-faint"
            />
            {isCapture && (
              <p className="mt-1.5 text-xs text-faint">Tags suggest as you type · Press Enter to capture</p>
            )}
          </div>

          <TaskClassifyDropdowns task={classifyTask} onChange={isCapture ? setClassify : set} />

          {showTodayActions && (
            <button
              type="button"
              onClick={() => toggleToday(task.id, task.inToday)}
              className={[
                "w-full rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors",
                task.inToday
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-border text-muted hover:border-accent hover:text-accent",
              ].join(" ")}
            >
              {task.inToday ? "In Today — tap to remove" : "Add to Today"}
            </button>
          )}

          {weekPlan && !isCapture && showTodayActions && (
            <button
              type="button"
              onClick={() => setTaskApprovedForWeek(weekKeyNow, task.id, !isApprovedForWeek)}
              className={[
                "w-full rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors",
                isApprovedForWeek
                  ? "border-accent/50 bg-accent-soft/50 text-accent"
                  : "border-border text-muted hover:border-accent hover:text-accent",
              ].join(" ")}
            >
              {isApprovedForWeek ? "Approved for this week ✓" : "Approve for this week"}
            </button>
          )}

          {!isCapture && (
            <button
              type="button"
              onClick={() => {
                const id = task.id;
                closeQuickEdit();
                openTaskWork(router, id);
              }}
              className="w-full rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-accent transition-colors hover:border-accent hover:bg-accent-soft/30"
            >
              Open Work View →
            </button>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-line px-4 py-3">
          {isCapture ? (
            <>
              <button type="button" onClick={abandonCapture} className="rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-canvas hover:text-ink">
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmCapture}
                disabled={!captureText.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-ink disabled:opacity-50"
              >
                Capture
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => deleteTask(task.id)} className="rounded-lg px-3 py-2 text-sm font-medium text-danger hover:bg-danger/10">
                Delete
              </button>
              {done ? (
                <button type="button" onClick={() => set({ status: "todo" })} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted hover:border-accent">
                  Reopen
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    completeTask(task.id);
                    closeQuickEdit();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-ink"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                    <path d="m5 13 4 4L19 7" />
                  </svg>
                  Mark done
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
