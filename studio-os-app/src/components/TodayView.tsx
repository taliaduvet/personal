"use client";

import { useState } from "react";
import { TASKS } from "@/lib/sample-data";
import type { Task } from "@/lib/types";
import { TaskCard } from "@/components/TaskCard";

export function TodayView() {
  const [tasks, setTasks] = useState<Task[]>(() =>
    TASKS.filter((t) => t.inToday && t.status !== "done").sort((a, b) => {
      const ea = a.doDateInDays ?? a.deadlineInDays ?? 99;
      const eb = b.doDateInDays ?? b.deadlineInDays ?? 99;
      return ea - eb;
    })
  );
  const [doneCount, setDoneCount] = useState(0);

  const complete = (id: string) => {
    setTasks((ts) => ts.filter((t) => t.id !== id));
    setDoneCount((n) => n + 1);
  };

  return (
    <section className="mx-auto max-w-2xl">
      <div className="flex items-baseline justify-between">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">Today</h1>
        <span className="text-sm text-muted">
          {doneCount > 0 ? `${doneCount} done · ` : ""}
          {tasks.length} to go
        </span>
      </div>
      <p className="mt-1 text-muted">One thing at a time. Your curated set for the day.</p>

      {tasks.length > 0 ? (
        <div className="mt-5 space-y-2">
          {tasks.map((t) => (
            <TaskCard key={t.id} task={t} onComplete={complete} />
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-border bg-surface p-6 text-center">
          <p className="font-display text-lg font-semibold text-ink">
            {doneCount > 0 ? "That's the lot for today." : "Nothing queued for today."}
          </p>
          <p className="mt-1 text-sm text-muted">
            {doneCount > 0
              ? "Everything you lined up is done. Go make something."
              : "Pull a few tasks in from the Lot to shape your day."}
          </p>
        </div>
      )}
    </section>
  );
}
