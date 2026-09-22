"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTasks } from "@/lib/store";
import { shippedTasks } from "@/lib/shelf";
import { useSettings } from "@/lib/settings-store";
import { weekKey } from "@/lib/week";
import { computeTodayBench, dateKeyFromOffset, mergeWeekFocusDraft, weekDaySlots } from "@/lib/week-focus";
import { deadlineLabel, deadlineTasks, isInboxTask, lifeAreaColor, planLabel, projectName } from "@/lib/lenses";
import { waitingCount } from "@/lib/waiting-on";
import { WeekPlanningCard } from "@/components/WeekPlanningCard";
import { SetupBanner } from "@/components/SetupBanner";
import { OnboardingCard } from "@/components/OnboardingCard";
import { TrustPanel } from "@/components/TrustPanel";
import { subscribeToPush } from "@/lib/push";

function greetingFor(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function DashboardView() {
  const { tasks, completeTask } = useTasks();
  const { weekStartsOn, lifeAreas, weekPlanning, settingsHydrated } = useSettings();

  // Time-of-day greeting is client-only to avoid SSR/client hydration drift.
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);

  const [notifPermission, setNotifPermission] = useState<NotificationPermission | null>(null);
  useEffect(() => {
    if (typeof Notification !== "undefined") setNotifPermission(Notification.permission);
  }, []);

  const active = useMemo(() => tasks.filter((t) => t.status !== "done"), [tasks]);

  // Mirrors TodayView.tsx's own weekDraft construction so this preview can
  // never disagree with what Today actually shows.
  const weekKeyNow = useMemo(() => weekKey(weekStartsOn, 0), [weekStartsOn]);
  const record = weekPlanning[weekKeyNow];
  const slots = useMemo(() => weekDaySlots(weekStartsOn), [weekStartsOn]);
  const weekDraft = useMemo(
    () =>
      mergeWeekFocusDraft(
        record
          ? {
              theme: record.theme,
              intention: record.intention,
              approvedTaskIds: record.approvedTaskIds,
              days: record.days,
              allDayDispositions: record.allDayDispositions,
            }
          : undefined,
        slots
      ),
    [record, slots]
  );
  const todayDateKey = dateKeyFromOffset(0);
  const { hasModeDay, modeBench, openDayTasks } = useMemo(
    () => computeTodayBench(tasks, weekDraft, weekStartsOn, todayDateKey),
    [tasks, weekDraft, weekStartsOn, todayDateKey]
  );
  // Wait for weekPlanning to hydrate from localStorage before trusting the
  // mode-day computation — otherwise a mode day flashes as "open" for a beat.
  const todayTasks = settingsHydrated ? (hasModeDay ? modeBench : openDayTasks) : [];

  const deadlines = useMemo(() => deadlineTasks(active), [active]);

  const inboxCount = useMemo(
    () => tasks.filter((t) => isInboxTask(t, lifeAreas)).length,
    [tasks, lifeAreas]
  );

  const waitingOnCount = useMemo(() => waitingCount(active), [active]);

  const shelfCount = useMemo(() => shippedTasks(tasks).length, [tasks]);

  const balance = useMemo(() => {
    const rows = lifeAreas.map((a) => ({
      id: a.id,
      name: a.name,
      color: a.color,
      count: active.filter((t) => t.lifeAreaId === a.id).length,
    })).filter((r) => r.count > 0);
    const max = rows.reduce((m, r) => Math.max(m, r.count), 0) || 1;
    return { rows, max };
  }, [active, lifeAreas]);

  return (
    <section className="space-y-5">
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
          {now ? greetingFor(now.getHours()) : "Hello"}
        </h1>
        <p className="mt-1 text-muted">
          {now
            ? now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })
            : "Your calm overview"}
        </p>
      </header>

      {/* The answer to "is everything held?" comes first — it is the reason
          the app exists, and burying it under setup cards defeats it. */}
      <TrustPanel />

      <SetupBanner />
      <OnboardingCard />

      {notifPermission === "default" && (
        <button
          type="button"
          onClick={async () => {
            await subscribeToPush();
            if (typeof Notification !== "undefined") setNotifPermission(Notification.permission);
          }}
          className="flex w-full items-center justify-between rounded-xl border border-border bg-surface px-4 py-3 text-left text-sm text-muted transition-colors hover:border-accent hover:text-ink"
        >
          <span>Turn on notifications</span>
          <span className="text-xs text-faint">get briefing reminders →</span>
        </button>
      )}

      <WeekPlanningCard />

      {waitingOnCount > 0 && (
        <Link
          href="/tasks?lens=waiting"
          className="block rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted transition-colors hover:border-accent hover:text-ink"
        >
          {waitingOnCount} waiting on others
        </Link>
      )}

      {shelfCount > 0 ? (
        <Link
          href="/archive?tab=shelf"
          className="block rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted transition-colors hover:border-accent hover:text-ink"
        >
          {shelfCount} on the shelf — see what you&apos;ve shipped
        </Link>
      ) : (
        <Link
          href="/archive"
          className="block rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted transition-colors hover:border-accent hover:text-ink md:hidden"
        >
          Archive — shelf, logbook, recipes
        </Link>
      )}

      {/* At-a-glance counters */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard href="/today" label="In Today" value={todayTasks.length} accent="text-accent" />
        <StatCard
          href="/deadlines"
          label="Deadlines"
          value={deadlines.length}
          accent={deadlines.length > 0 ? "text-danger" : "text-muted"}
        />
        <StatCard href="/inbox" label="To sort" value={inboxCount} accent="text-muted" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Today's focus */}
        <Card>
          <CardHead title="Today's focus" href="/today" cta="Open Today" />
          {todayTasks.length > 0 ? (
            <ul className="mt-3 space-y-1">
              {todayTasks.slice(0, 4).map((t) => {
                const deadline = deadlineLabel(t.deadlineInDays);
                const plan = planLabel(t.doPlan, weekStartsOn);
                return (
                  <li key={t.id} className="flex items-center gap-2.5 py-1">
                    <button
                      type="button"
                      onClick={() => completeTask(t.id)}
                      aria-label="Mark complete"
                      className="h-3.5 w-3.5 shrink-0 rounded-full border-2 transition-colors hover:border-accent"
                      style={{ borderColor: lifeAreaColor(t.lifeAreaId) }}
                    />
                    <span className="min-w-0 flex-1 truncate text-sm text-ink">{t.title}</span>
                    {deadline ? (
                      <span className={["shrink-0 text-xs font-medium", deadline.tone === "danger" ? "text-danger" : "text-muted"].join(" ")}>
                        {deadline.text}
                      </span>
                    ) : plan ? (
                      <span className="shrink-0 text-xs text-faint">{plan}</span>
                    ) : null}
                  </li>
                );
              })}
              {todayTasks.length > 4 && (
                <li className="pt-1 text-xs text-faint">+{todayTasks.length - 4} more in Today</li>
              )}
            </ul>
          ) : hasModeDay ? (
            <Empty>Nothing planned yet — open Today to set up your day.</Empty>
          ) : (
            <Empty>Nothing queued yet. Pull a few in from the Lot to shape your day.</Empty>
          )}
        </Card>

        {/* Deadline radar — the only pressure surface */}
        <Card>
          <CardHead title="Deadline radar" href="/deadlines" cta="Horizon" />
          {deadlines.length > 0 ? (
            <ul className="mt-3 space-y-1">
              {deadlines.slice(0, 4).map((t) => {
                const deadline = deadlineLabel(t.deadlineInDays);
                return (
                  <li key={t.id} className="flex items-center gap-2.5 py-1">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: lifeAreaColor(t.lifeAreaId) }} />
                    <span className="min-w-0 flex-1 truncate text-sm text-ink">{t.title}</span>
                    {t.projectId && (
                      <span className="hidden shrink-0 truncate text-xs text-faint sm:inline">
                        → {projectName(t.projectId)}
                      </span>
                    )}
                    {deadline && (
                      <span className={["shrink-0 text-xs font-medium", deadline.tone === "danger" ? "text-danger" : "text-muted"].join(" ")}>
                        {deadline.text}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <Empty>No hard deadlines on the horizon. Breathe easy.</Empty>
          )}
        </Card>
      </div>

      {/* Life balance */}
      <Card>
        <CardHead title="Life balance" href="/tasks" cta="By area" />
        {balance.rows.length > 0 ? (
          <div className="mt-3 space-y-2.5">
            {balance.rows.map((r) => (
              <div key={r.id} className="flex items-center gap-3">
                <span className="w-28 shrink-0 truncate text-sm text-muted">{r.name}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-canvas">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(r.count / balance.max) * 100}%`, background: r.color }}
                  />
                </div>
                <span className="w-6 shrink-0 text-right text-xs text-faint">{r.count}</span>
              </div>
            ))}
          </div>
        ) : (
          <Empty>No active tasks. A rare and beautiful thing.</Empty>
        )}
      </Card>
    </section>
  );
}

function StatCard({ href, label, value, accent }: { href: string; label: string; value: number; accent: string }) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-border bg-surface px-3 py-3 transition-colors hover:border-accent"
    >
      <div className={["font-display text-2xl font-semibold tabular-nums", accent].join(" ")}>{value}</div>
      <div className="mt-0.5 text-xs text-muted">{label}</div>
    </Link>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-border bg-surface p-4">{children}</div>;
}

function CardHead({ title, href, cta }: { title: string; href: string; cta: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <h2 className="font-display text-base font-semibold text-ink">{title}</h2>
      <Link href={href} className="text-xs font-medium text-accent hover:text-accent-ink">
        {cta} →
      </Link>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 text-sm text-muted">{children}</p>;
}
