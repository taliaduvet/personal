"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ── Types ────────────────────────────────────────────────────────────────────

type MoodId = "calm" | "grounded" | "foggy" | "heavy" | "bright";
type Source = "manual" | "day-close" | "weekly-review";

interface JournalEntry {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // display label
  mood: MoodId;
  source: Source;
  text: string;   // plain text for searching / tag detection
  html?: string;  // rich text (optional; falls back to text)
}

// ── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = "studio-os:journal-entries";

const MOOD_DEFS: { id: MoodId; label: string; color: string }[] = [
  { id: "calm", label: "Calm", color: "#3d6f9f" },
  { id: "grounded", label: "Grounded", color: "#3c8262" },
  { id: "foggy", label: "Foggy", color: "#69737e" },
  { id: "heavy", label: "Heavy", color: "#bc6740" },
  { id: "bright", label: "Bright", color: "#6a5dc0" },
];

const TAG_DICT: { label: string; color: string; soft: string; match: string[] }[] = [
  { label: "Touring", color: "#3d6f9f", soft: "#e5eef6", match: ["tour", "touring", "venue", "rehears"] },
  { label: "Release", color: "#3c8262", soft: "#e2f1e8", match: ["release", "launch", "single", "ep", "mix", "master"] },
  { label: "Grant", color: "#6a5dc0", soft: "#efeafb", match: ["grant", "funding"] },
  { label: "Promo", color: "#bc6740", soft: "#fbeadf", match: ["promo", "press", "artwork", "calendar"] },
  { label: "Admin", color: "#69737e", soft: "#eceff2", match: ["admin", "invoice", "email", "paperwork", "budget"] },
];

const SOURCE_BADGE: Partial<Record<Source, string>> = {
  "day-close": "From day-close",
  "weekly-review": "From weekly review",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function moodOf(id: MoodId) {
  return MOOD_DEFS.find((m) => m.id === id) ?? MOOD_DEFS[0];
}

function detectTags(text: string) {
  const lower = text.toLowerCase();
  return TAG_DICT.filter((t) => t.match.some((m) => lower.includes(m)));
}

function groupLabel(dateStr: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + "T00:00:00");
  const diff = Math.round((today.getTime() - d.getTime()) / 86400000);
  if (diff <= 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff <= 7) return "This week";
  return "Earlier";
}

function formatDisplayTime(date: Date) {
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function formatDateLabel(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function loadEntries(): JournalEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as JournalEntry[]) : [];
  } catch {
    return [];
  }
}

function saveEntries(entries: JournalEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

// ── Dot helper ───────────────────────────────────────────────────────────────

function Dot({ color, size = 8 }: { color: string; size?: number }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "999px",
        background: color,
        flexShrink: 0,
      }}
    />
  );
}

// ── Tag chips ────────────────────────────────────────────────────────────────

function TagChip({ label, color, soft }: { label: string; color: string; soft: string }) {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 500,
        color,
        background: soft,
        borderRadius: "999px",
        padding: "3px 9px",
      }}
    >
      {label}
    </span>
  );
}

// ── Entry card ───────────────────────────────────────────────────────────────

function EntryCard({
  entry,
  onOpen,
}: {
  entry: JournalEntry;
  onOpen: () => void;
}) {
  const mood = moodOf(entry.mood);
  const tags = detectTags(entry.text);
  const badge = SOURCE_BADGE[entry.source];

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full flex-col gap-1.5 rounded-[14px] border border-border bg-surface px-3.5 py-3 text-left"
    >
      <div className="flex items-center gap-2">
        <Dot color={mood.color} />
        <span className="text-xs text-muted">{entry.time}</span>
        {badge && (
          <span className="ml-auto rounded-full bg-accent-soft px-2 py-0.5 text-[11px] text-accent-ink">
            {badge}
          </span>
        )}
      </div>
      <p className="line-clamp-2 text-sm leading-relaxed text-ink">{entry.text}</p>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <TagChip key={t.label} {...t} />
          ))}
        </div>
      )}
    </button>
  );
}

// ── List view ────────────────────────────────────────────────────────────────

function ListView({
  entries,
  onOpen,
  onCompose,
}: {
  entries: JournalEntry[];
  onOpen: (id: string) => void;
  onCompose: () => void;
}) {
  const sorted = [...entries].sort((a, b) =>
    a.date + a.time < b.date + b.time ? 1 : -1
  );

  const groups: { label: string; items: JournalEntry[] }[] = [];
  const seen = new Set<string>();
  sorted.forEach((e) => {
    const label = groupLabel(e.date);
    if (!seen.has(label)) {
      seen.add(label);
      groups.push({ label, items: [] });
    }
    groups[groups.length - 1].items.push(e);
  });

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 6);
  weekAgo.setHours(0, 0, 0, 0);
  const checkedInCount = entries.filter(
    (e) => new Date(e.date + "T00:00:00") >= weekAgo
  ).length;

  return (
    <div className="animate-fade-up">
      <button
        type="button"
        onClick={onCompose}
        className="mb-2 flex w-full items-center gap-3 rounded-[18px] border border-border bg-surface px-5 py-4 text-left"
      >
        <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </span>
        <span className="text-[15px] text-muted">What&apos;s on your mind right now?</span>
      </button>

      <p className="mb-5 text-xs text-faint">
        You&apos;ve checked in {checkedInCount} {checkedInCount === 1 ? "time" : "times"} this week.
      </p>

      {groups.length === 0 && (
        <p className="text-sm text-muted">No entries yet — tap above to write your first one.</p>
      )}

      {groups.map((g) => (
        <div key={g.label} className="mb-5">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-faint">
            {g.label}
          </p>
          <div className="flex flex-col gap-2">
            {g.items.map((e) => (
              <EntryCard key={e.id} entry={e} onOpen={() => onOpen(e.id)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Calendar view ─────────────────────────────────────────────────────────────

function CalendarView({
  entries,
  onOpen,
}: {
  entries: JournalEntry[];
  onOpen: (id: string) => void;
}) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const navMonth = (delta: number) => {
    setMonth((m) => {
      let nm = m + delta;
      if (nm < 0) { nm = 11; setYear((y) => y - 1); }
      else if (nm > 11) { nm = 0; setYear((y) => y + 1); }
      return nm;
    });
  };

  const monthLabel = new Date(year, month, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const byDate: Record<string, JournalEntry> = {};
  entries.forEach((e) => { if (!byDate[e.date]) byDate[e.date] = e; });

  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  type Cell = { key: string; day: number | null; dateStr: string | null; entry: JournalEntry | null; isToday: boolean };
  const cells: Cell[] = [];
  for (let i = 0; i < firstDow; i++) {
    cells.push({ key: `e${i}`, day: null, dateStr: null, entry: null, isToday: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${pad(month + 1)}-${pad(d)}`;
    const isToday =
      today.getFullYear() === year &&
      today.getMonth() === month &&
      today.getDate() === d;
    cells.push({ key: dateStr, day: d, dateStr, entry: byDate[dateStr] ?? null, isToday });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ key: `t${cells.length}`, day: null, dateStr: null, entry: null, isToday: false });
  }

  return (
    <div className="animate-fade-up">
      <div className="rounded-[18px] border border-border bg-surface p-4">
        <div className="mb-3.5 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navMonth(-1)}
            className="px-2 py-1 text-muted"
          >
            ←
          </button>
          <span className="font-display text-[15px] font-semibold">{monthLabel}</span>
          <button
            type="button"
            onClick={() => navMonth(1)}
            className="px-2 py-1 text-muted"
          >
            →
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {["S", "M", "T", "W", "T", "F", "S"].map((wd, i) => (
            <div key={i} className="pb-0.5 text-center text-[11px] text-faint">
              {wd}
            </div>
          ))}
          {cells.map((cell) => {
            const mood = cell.entry ? moodOf(cell.entry.mood) : null;
            return (
              <button
                key={cell.key}
                type="button"
                disabled={!cell.entry}
                onClick={() => cell.entry && onOpen(cell.entry.id)}
                style={cell.isToday ? { background: "#eeeffb" } : undefined}
                className={[
                  "flex flex-col items-center gap-1 rounded-[10px] py-2 text-[13px]",
                  cell.day === null ? "invisible" : "",
                  cell.isToday ? "font-semibold text-accent" : "text-ink",
                  cell.entry ? "cursor-pointer" : "cursor-default",
                ].join(" ")}
              >
                <span>{cell.day}</span>
                {mood && <Dot color={mood.color} size={6} />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3.5 flex flex-wrap gap-3.5">
        {MOOD_DEFS.map((m) => (
          <span key={m.id} className="flex items-center gap-1.5 text-xs text-muted">
            <Dot color={m.color} />
            {m.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Detail view ──────────────────────────────────────────────────────────────

function DetailView({
  entry,
  onBack,
  onDelete,
}: {
  entry: JournalEntry;
  onBack: () => void;
  onDelete: (id: string) => void;
}) {
  const mood = moodOf(entry.mood);
  const tags = detectTags(entry.text);
  const sourceNote =
    entry.source === "day-close"
      ? "Pulled in automatically from your day-close retro."
      : entry.source === "weekly-review"
      ? "Pulled in automatically from your weekly reflection."
      : null;

  return (
    <div className="max-w-2xl animate-fade-up">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 text-[13px] text-muted"
      >
        ← Back to Journal
      </button>

      <div className="mb-1 flex items-center gap-2.5">
        <Dot color={mood.color} size={10} />
        <span className="text-[13px] text-muted">
          {formatDateLabel(entry.date)} · {entry.time}
        </span>
      </div>
      <h1 className="font-display mb-3 text-2xl font-semibold">{mood.label}</h1>

      {sourceNote && (
        <div className="mb-3.5 rounded-xl bg-accent-soft px-3.5 py-2.5 text-[13px] text-accent-ink">
          {sourceNote}
        </div>
      )}

      {entry.html ? (
        <div
          className="journal-body rounded-[18px] border border-border bg-surface px-6 py-5 text-base leading-[1.8] text-ink"
          style={{ fontFamily: "var(--font-source-serif), Georgia, serif" }}
          dangerouslySetInnerHTML={{ __html: entry.html }}
        />
      ) : (
        <div
          className="rounded-[18px] border border-border bg-surface px-6 py-5 text-base leading-[1.8] text-ink"
          style={{ whiteSpace: "pre-wrap", fontFamily: "var(--font-source-serif), Georgia, serif" }}
        >
          {entry.text}
        </div>
      )}

      {tags.length > 0 && (
        <div className="mt-3.5 flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <TagChip key={t.label} {...t} />
          ))}
        </div>
      )}

      <div className="mt-5 flex gap-2.5">
        <button
          type="button"
          onClick={() => {
            if (confirm("Delete this entry?")) onDelete(entry.id);
          }}
          className="text-[13px] font-medium text-danger"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

// ── Compose overlay ───────────────────────────────────────────────────────────

type FontSize = "sm" | "base" | "lg";

const FONT_SIZE_STYLES: Record<FontSize, string> = {
  sm: "17px",
  base: "21px",
  lg: "26px",
};

function execFmt(cmd: string, value?: string) {
  document.execCommand(cmd, false, value);
}

function ComposeOverlay({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (text: string, html: string, mood: MoodId) => void;
}) {
  const [mood, setMood] = useState<MoodId>("calm");
  const [fontSize, setFontSize] = useState<FontSize>("base");
  const [boldActive, setBoldActive] = useState(false);
  const [italicActive, setItalicActive] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    editorRef.current?.focus();
  }, []);

  const updateFormatState = () => {
    setBoldActive(document.queryCommandState("bold"));
    setItalicActive(document.queryCommandState("italic"));
  };

  const save = () => {
    const el = editorRef.current;
    if (!el) { onClose(); return; }
    const html = el.innerHTML;
    const text = el.innerText.trim();
    if (text) onSave(text, html, mood);
    else onClose();
  };

  const dateLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-canvas"
      style={{ animation: "fadeIn .3s ease" }}
    >
      <div className="flex flex-shrink-0 items-center justify-between px-6 py-5">
        <button type="button" onClick={onClose} aria-label="Close" className="text-faint">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
        <span className="text-[13px] text-faint">{dateLabel}</span>
      </div>

      {/* Formatting toolbar */}
      <div className="flex flex-shrink-0 items-center gap-1 border-b border-border px-6 pb-3">
        <FormatButton
          active={boldActive}
          onClick={() => { execFmt("bold"); editorRef.current?.focus(); updateFormatState(); }}
          title="Bold"
        >
          <strong>B</strong>
        </FormatButton>
        <FormatButton
          active={italicActive}
          onClick={() => { execFmt("italic"); editorRef.current?.focus(); updateFormatState(); }}
          title="Italic"
        >
          <em>I</em>
        </FormatButton>
        <span className="mx-1 h-4 w-px bg-border" />
        {(["sm", "base", "lg"] as FontSize[]).map((s) => (
          <FormatButton
            key={s}
            active={fontSize === s}
            onClick={() => setFontSize(s)}
            title={s === "sm" ? "Small" : s === "base" ? "Normal" : "Large"}
          >
            <span style={{ fontSize: s === "sm" ? 11 : s === "base" ? 13 : 16, lineHeight: 1 }}>
              A
            </span>
          </FormatButton>
        ))}
      </div>

      <div className="flex flex-1 justify-center overflow-y-auto px-6 pb-10 pt-6">
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onKeyUp={updateFormatState}
          onMouseUp={updateFormatState}
          data-placeholder="Start writing…"
          className="journal-editor w-full max-w-2xl text-ink outline-none"
          style={{
            fontFamily: "var(--font-source-serif), Georgia, serif",
            fontSize: FONT_SIZE_STYLES[fontSize],
            lineHeight: 1.85,
            minHeight: "56vh",
          }}
        />
      </div>

      <div className="flex flex-shrink-0 items-center justify-center gap-4 px-6 pb-safe pt-3.5">
        {MOOD_DEFS.map((m) => (
          <button
            key={m.id}
            type="button"
            title={m.label}
            onClick={() => setMood(m.id)}
            style={{
              width: 26, height: 26, borderRadius: "999px",
              background: m.color, padding: 0, cursor: "pointer",
              border: `2px solid ${mood === m.id ? m.color : "transparent"}`,
              opacity: mood === m.id ? 1 : 0.45,
              outline: mood === m.id ? `2px solid ${m.color}` : "none",
              outlineOffset: 2,
            }}
          />
        ))}
        <span className="h-4 w-px bg-border" />
        <button type="button" onClick={save} className="rounded-full bg-ink px-5 py-2 text-[13px] font-medium text-canvas">
          Done
        </button>
      </div>
    </div>
  );
}

function FormatButton({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className={[
        "flex h-8 w-8 items-center justify-center rounded-lg text-sm transition-colors",
        active ? "bg-accent-soft text-accent" : "text-muted hover:bg-border hover:text-ink",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

// ── Main view ─────────────────────────────────────────────────────────────────

type ViewMode = "list" | "calendar";
type Overlay = "compose" | "detail" | null;

export function JournalView() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    setEntries(loadEntries());
    setLoaded(true);
  }, []);

  const persistEntries = useCallback((next: JournalEntry[]) => {
    setEntries(next);
    saveEntries(next);
  }, []);

  const handleSave = (text: string, html: string, mood: MoodId) => {
    const now = new Date();
    const entry: JournalEntry = {
      id: `j${Date.now()}`,
      date: todayStr(),
      time: formatDisplayTime(now),
      mood,
      source: "manual",
      text,
      html,
    };
    persistEntries([entry, ...entries]);
    setOverlay(null);
  };

  const handleDelete = (id: string) => {
    persistEntries(entries.filter((e) => e.id !== id));
    setOverlay(null);
    setSelectedId(null);
  };

  const openEntry = (id: string) => {
    setSelectedId(id);
    setOverlay("detail");
  };

  const selectedEntry = selectedId ? entries.find((e) => e.id === selectedId) ?? null : null;

  if (!loaded) return null;

  return (
    <>
      <div className="mx-auto w-full max-w-[960px] px-5 pb-24 pt-6">
        {overlay !== "detail" && (
          <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="font-display text-[28px] font-semibold tracking-tight text-ink">
                Journal
              </h1>
              <p className="mt-1.5 max-w-[34rem] text-sm leading-relaxed text-muted">
                A quiet place to notice how the work is actually landing. No streaks to keep, nothing to perfect.
              </p>
            </div>
            <div className="flex flex-shrink-0 gap-0.5 rounded-xl border border-border bg-surface p-[3px]">
              <TabButton active={viewMode === "list"} onClick={() => setViewMode("list")}>
                List
              </TabButton>
              <TabButton active={viewMode === "calendar"} onClick={() => setViewMode("calendar")}>
                Calendar
              </TabButton>
            </div>
          </div>
        )}

        {overlay === "detail" && selectedEntry ? (
          <DetailView
            entry={selectedEntry}
            onBack={() => { setOverlay(null); setSelectedId(null); }}
            onDelete={handleDelete}
          />
        ) : viewMode === "list" ? (
          <ListView
            entries={entries}
            onOpen={openEntry}
            onCompose={() => setOverlay("compose")}
          />
        ) : (
          <CalendarView entries={entries} onOpen={openEntry} />
        )}
      </div>

      {overlay === "compose" && (
        <ComposeOverlay
          onClose={() => setOverlay(null)}
          onSave={handleSave}
        />
      )}
    </>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-[9px] px-4 py-[7px] text-[13px] font-medium",
        active ? "bg-accent text-white" : "text-muted",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
