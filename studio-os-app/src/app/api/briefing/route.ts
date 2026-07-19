import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateGeminiText, hasGeminiKey } from "@/lib/gemini";
import type { Project, Task } from "@/lib/types";
import { respondByOffset, RESPOND_STRIP_MAX } from "@/lib/needs-respond";
import { deadlineOffsetFromDateKey } from "@/lib/do-plan";
import { addDaysToDateKey, localDateKey } from "@/lib/local-date";
import { partitionForBriefing } from "@/lib/briefing-partition";
import { weekKey } from "@/lib/week";

export const maxDuration = 60;

function compactTask(t: Task, from = new Date()) {
  const by = respondByOffset(t, from);
  const deadlineBy =
    t.deadlineDateKey != null ? deadlineOffsetFromDateKey(t.deadlineDateKey, from) : null;
  return {
    id: t.id,
    title: t.title,
    notes: (t.notes ?? "").slice(0, 280),
    personName: t.personName ?? null,
    projectId: t.projectId,
    lifeAreaId: t.lifeAreaId,
    needsRespond: Boolean(t.needsRespond),
    respondByDateKey: t.respondByDateKey ?? null,
    respondByDays: by,
    urgencyReason: t.urgencyReason ?? null,
    deadlineDateKey: t.deadlineDateKey ?? null,
    deadlineDays: deadlineBy,
    inToday: t.inToday,
    workModeId: t.workModeId,
    status: t.status,
  };
}

function compactProject(p: Project) {
  return {
    id: p.id,
    name: p.name,
    lifeAreaId: p.lifeAreaId,
  };
}

function buildAssistantPrompt(input: {
  todayKey: string;
  weekTheme: string | null;
  modeDay: string | null;
  contacts: string[];
  projects: ReturnType<typeof compactProject>[];
  onFire: ReturnType<typeof compactTask>[];
  topReplies: ReturnType<typeof compactTask>[];
  safelyParked: ReturnType<typeof compactTask>[];
  todayBench: ReturnType<typeof compactTask>[];
  horizon: ReturnType<typeof compactTask>[];
  otherOpen: ReturnType<typeof compactTask>[];
  recentLogbook: { date: string; line: string }[];
  weekReflection: string | null;
  respondCount: number;
}): string {
  return `You are Studio OS — a calm creative operations assistant for an independent artist with communication anxiety.
Today is ${input.todayKey}. That date is truth.

Your job is NOT a guilt checklist. Help them see their whole plate, prioritize gently, and give permission to defer.
Studio OS already sorted reply buckets — do not reshuffle task ids across buckets.

Write plain markdown with these sections IN ORDER:

1. **Landscape** — 2–4 sentences: what's true across creative work, replies, deadlines, and tone you notice in notes. Optional one emotional read (anxious / tender / clear) only if notes support it.
2. **Must today** — only items in onFire. If empty: "Nothing forced today — good."
3. **Worth choosing** — at most ONE soft suggestion from topReplies OR todayBench (optional). Frame as choice, not obligation ("if you have 10 min…"). If nothing fits: "No soft pick needed."
4. **Parked on purpose** — summarize safelyParked (and soft topReplies not chosen) with come-back dates + urgencyReason when present. Affirm waiting is fine.
5. **Defer ideas** — 1–3 concrete defer suggestions (e.g. "Push Brandon to Friday — no hard ask in the message"). Do not invent people/tasks.
6. **Horizon** — light mention of upcoming deadlines / horizon tasks (facts only).

Rules:
- Use ONLY data in JSON. No invented email/WhatsApp threads.
- Same task id in at most one action section (Must / Worth choosing). Parked may list others.
- No pep-talk filler. No "avoid perfectionism" unless a note says that.
- Under ~220 words. No emoji.

CONTEXT:
${JSON.stringify(
  {
    today: input.todayKey,
    weekTheme: input.weekTheme,
    modeDay: input.modeDay,
    vipContacts: input.contacts,
    projects: input.projects,
    needsReplyOpen: input.respondCount,
    onFire: input.onFire,
    topReplies: input.topReplies,
    safelyParked: input.safelyParked,
    todayBench: input.todayBench,
    horizon: input.horizon,
    otherOpenSample: input.otherOpen,
    recentLogbook: input.recentLogbook,
    weekReflection: input.weekReflection,
  },
  null,
  2
)}`;
}

/** POST — full-vault assistant briefing (session auth). */
export async function POST() {
  if (!hasGeminiKey()) {
    return NextResponse.json(
      { error: "ai_unavailable", message: "AI unavailable — set GEMINI_API_KEY in Netlify env." },
      { status: 503 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const todayKey = localDateKey(now);
  const horizonEnd = addDaysToDateKey(todayKey, 14);

  const [tasksRes, projectsRes, settingsRes, reviewsRes, logbookRes] = await Promise.all([
    supabase.from("sos_tasks").select("id,data,deleted").eq("deleted", false),
    supabase.from("sos_projects").select("id,data,deleted").eq("deleted", false),
    supabase.from("sos_settings").select("data").maybeSingle(),
    supabase.from("sos_reviews").select("week_key,reflection,intentions"),
    supabase.from("sos_logbook").select("date_key,line"),
  ]);

  const failed =
    tasksRes.error || projectsRes.error || settingsRes.error || reviewsRes.error || logbookRes.error;
  if (failed) {
    return NextResponse.json({ error: "db_error", message: failed.message }, { status: 500 });
  }

  const tasks = (tasksRes.data ?? [])
    .map((r) => r.data as Task)
    .filter((t) => t && t.status !== "done" && t.title?.trim());

  const projects = (projectsRes.data ?? [])
    .map((r) => r.data as Project)
    .filter((p) => p?.id && p?.name);

  const settings = (settingsRes.data?.data ?? {}) as {
    weekStartsOn?: 0 | 1;
    weekPlanning?: Record<
      string,
      { theme?: string | null; days?: Record<string, { focus?: string | null }> }
    >;
    contacts?: { name: string }[];
  };
  const wk = weekKey(settings.weekStartsOn ?? 1, 0);
  const weekRec = settings.weekPlanning?.[wk];
  const weekTheme = weekRec?.theme?.trim() || null;
  const todayFocusEntry = weekRec?.days?.[todayKey];
  const modeDay = todayFocusEntry?.focus ? String(todayFocusEntry.focus) : null;

  const contacts = (settings.contacts ?? []).map((c) => c.name).filter(Boolean).slice(0, 20);

  const parts = partitionForBriefing(tasks, now);
  const partIds = new Set([
    ...parts.onFire.map((t) => t.id),
    ...parts.topReplies.map((t) => t.id),
    ...parts.safelyParked.map((t) => t.id),
    ...parts.todayBench.map((t) => t.id),
  ]);

  const horizon = tasks
    .filter((t) => {
      if (partIds.has(t.id)) return false;
      if (!t.deadlineDateKey) return false;
      return t.deadlineDateKey >= todayKey && t.deadlineDateKey <= horizonEnd;
    })
    .slice(0, 12);

  const otherOpen = tasks
    .filter((t) => !partIds.has(t.id) && !horizon.some((h) => h.id === t.id))
    .slice(0, 15);

  const reviewRows = reviewsRes.data ?? [];
  const weekReflection =
    reviewRows.find((r) => r.week_key === wk)?.reflection?.trim() ||
    reviewRows.sort((a, b) => String(b.week_key).localeCompare(String(a.week_key)))[0]
      ?.reflection?.trim() ||
    null;

  const logRows = (logbookRes.data ?? [])
    .map((r) => ({ date: String(r.date_key), line: String(r.line ?? "").slice(0, 160) }))
    .filter((r) => r.line.trim())
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  const prompt = buildAssistantPrompt({
    todayKey,
    weekTheme,
    modeDay,
    contacts,
    projects: projects.slice(0, 20).map(compactProject),
    onFire: parts.onFire.map((t) => compactTask(t, now)),
    topReplies: parts.topReplies.map((t) => compactTask(t, now)),
    safelyParked: parts.safelyParked.map((t) => compactTask(t, now)),
    todayBench: parts.todayBench.map((t) => compactTask(t, now)),
    horizon: horizon.map((t) => compactTask(t, now)),
    otherOpen: otherOpen.map((t) => compactTask(t, now)),
    recentLogbook: logRows,
    weekReflection: weekReflection ? weekReflection.slice(0, 400) : null,
    respondCount: parts.respondCount,
  });

  try {
    const briefing = await generateGeminiText(prompt, {
      temperature: 0.35,
      maxOutputTokens: 1024,
    });
    return NextResponse.json({
      briefing,
      counts: {
        needsRespond: parts.respondCount,
        onFire: parts.onFire.length,
        topReplies: parts.topReplies.length,
        safelyParked: parts.safelyParked.length,
        todayBench: parts.todayBench.length,
        horizon: horizon.length,
        projects: projects.length,
        stripMax: RESPOND_STRIP_MAX,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "briefing_failed";
    console.warn("[briefing]", message);
    return NextResponse.json(
      {
        error: "ai_unavailable",
        message: "AI unavailable right now — try again in a moment.",
        detail: message.slice(0, 160),
      },
      { status: 503 }
    );
  }
}
