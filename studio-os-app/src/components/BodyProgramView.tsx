"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import { localDateKey, parseLocalDateKey } from "@/lib/local-date";
import {
  DATA,
  EMPTY_STATE,
  NOTES_HTML,
  PRINCIPLE,
  TRACK_SHORT_LABEL,
  TRACK_TARGET,
  countedItems,
  dayRecord,
  formatClock,
  isGroupHeading,
  itemById,
  loadBodyProgramState,
  saveBodyProgramState,
  trackDoneOnDate,
  weekDateKeys,
  weekLabel,
  type BodyProgramFeel,
  type BodyProgramItem,
  type BodyProgramSection,
  type BodyProgramState,
  type BodyProgramTrack,
} from "@/lib/body-program";

// ── Local constants ─────────────────────────────────────────────────────────

const TRACKS: BodyProgramTrack[] = ["daily", "stability", "mobility"];

const TABS: { id: BodyProgramSection; label: string }[] = [
  { id: "daily", label: "Daily" },
  { id: "stability", label: "Stability" },
  { id: "mobility", label: "Mobility" },
  { id: "notes", label: "Notes" },
];

const SECTION_ACCENT: Record<BodyProgramSection, string> = {
  daily: "var(--color-track-daily)",
  stability: "var(--color-track-stability)",
  mobility: "var(--color-track-mobility)",
  notes: "var(--color-accent)",
};

const TRACK_TEXT_CLASS: Record<BodyProgramTrack, string> = {
  daily: "text-[var(--color-track-daily)]",
  stability: "text-[var(--color-track-stability)]",
  mobility: "text-[var(--color-track-mobility)]",
};

const TRACK_BG_CLASS: Record<BodyProgramTrack, string> = {
  daily: "bg-[var(--color-track-daily)]",
  stability: "bg-[var(--color-track-stability)]",
  mobility: "bg-[var(--color-track-mobility)]",
};

const TRACK_BORDER_CLASS: Record<BodyProgramTrack, string> = {
  daily: "border-[var(--color-track-daily)]",
  stability: "border-[var(--color-track-stability)]",
  mobility: "border-[var(--color-track-mobility)]",
};

interface TimerState {
  itemId: string;
  phaseIndex: number;
  secondsLeft: number;
  running: boolean;
}

// ── Root component ───────────────────────────────────────────────────────

export function BodyProgramView() {
  const [state, setState] = useState<BodyProgramState>(EMPTY_STATE);
  const [hydrated, setHydrated] = useState(false);
  const [section, setSection] = useState<BodyProgramSection>("daily");
  const [weekOffset, setWeekOffset] = useState(0);
  const [openCards, setOpenCards] = useState<Record<string, boolean>>({});
  const [timer, setTimer] = useState<TimerState | null>(null);
  const [copied, setCopied] = useState(false);
  const [dump, setDump] = useState<string | null>(null);

  const timerRef = useRef<TimerState | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    setState(loadBodyProgramState());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveBodyProgramState(state);
  }, [state, hydrated]);

  useEffect(() => {
    timerRef.current = timer;
  }, [timer]);

  // One-second tick, driven off a ref so it never closes over a stale timer.
  useEffect(() => {
    if (!timer?.running) return;
    const id = window.setInterval(() => {
      const current = timerRef.current;
      if (!current || !current.running) return;
      const item = itemById(current.itemId);
      if (!item?.phases) return;

      if (current.secondsLeft > 1) {
        const next = { ...current, secondsLeft: current.secondsLeft - 1 };
        timerRef.current = next;
        setTimer(next);
        return;
      }

      const nextPhaseIndex = current.phaseIndex + 1;
      if (nextPhaseIndex >= item.phases.length) {
        const next: TimerState = { itemId: current.itemId, phaseIndex: nextPhaseIndex, secondsLeft: 0, running: false };
        timerRef.current = next;
        setTimer(next);
        playBeep("end");
        vibrate([90, 60, 90]);
        void releaseWakeLock();
        markItemDoneToday(item);
      } else {
        const next: TimerState = {
          itemId: current.itemId,
          phaseIndex: nextPhaseIndex,
          secondsLeft: item.phases[nextPhaseIndex][1],
          running: true,
        };
        timerRef.current = next;
        setTimer(next);
        playBeep("phase");
      }
    }, 1000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer?.running, timer?.itemId]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden && timerRef.current?.running) void releaseWakeLock();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    return () => {
      void wakeLockRef.current?.release();
    };
  }, []);

  function playBeep(kind: "phase" | "end") {
    try {
      const ctx = audioCtxRef.current ?? new AudioContext();
      audioCtxRef.current = ctx;
      const now = ctx.currentTime;
      const tones: [number, number][] = kind === "end" ? [[660, 0], [880, 0.16], [1100, 0.32]] : [[820, 0]];
      tones.forEach(([freq, t]) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = freq;
        osc.type = "sine";
        osc.connect(gain);
        gain.connect(ctx.destination);
        gain.gain.setValueAtTime(0, now + t);
        gain.gain.linearRampToValueAtTime(0.22, now + t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + t + 0.3);
        osc.start(now + t);
        osc.stop(now + t + 0.32);
      });
    } catch {
      /* ignore */
    }
  }

  function vibrate(pattern: number | number[]) {
    try {
      navigator.vibrate?.(pattern);
    } catch {
      /* ignore */
    }
  }

  async function requestWakeLock() {
    try {
      if (!wakeLockRef.current) wakeLockRef.current = await navigator.wakeLock.request("screen");
    } catch {
      /* ignore */
    }
  }

  async function releaseWakeLock() {
    try {
      await wakeLockRef.current?.release();
    } catch {
      /* ignore */
    }
    wakeLockRef.current = null;
  }

  function markItemDoneToday(item: BodyProgramItem) {
    if (item.nocount) return;
    const key = localDateKey(new Date());
    setState((prev) => {
      const rec = dayRecord(prev, key);
      if (rec.checks[item.id]) return prev;
      return { days: { ...prev.days, [key]: { ...rec, checks: { ...rec.checks, [item.id]: true } } } };
    });
  }

  function toggleCheck(item: BodyProgramItem) {
    const key = localDateKey(new Date());
    setState((prev) => {
      const rec = dayRecord(prev, key);
      const nextChecks = { ...rec.checks };
      if (nextChecks[item.id]) delete nextChecks[item.id];
      else nextChecks[item.id] = true;
      return { days: { ...prev.days, [key]: { ...rec, checks: nextChecks } } };
    });
  }

  function toggleOpen(id: string) {
    setOpenCards((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function goWeek(delta: number) {
    setWeekOffset((prev) => Math.min(0, prev + delta));
  }

  function setFeelToday(feel: BodyProgramFeel) {
    const key = localDateKey(new Date());
    setState((prev) => {
      const rec = dayRecord(prev, key);
      return { days: { ...prev.days, [key]: { ...rec, feel: rec.feel === feel ? null : feel } } };
    });
  }

  function toggleTimer(item: BodyProgramItem) {
    if (!item.phases) return;
    const current = timer;
    const isSameItem = current?.itemId === item.id;
    const finished = isSameItem && current.phaseIndex >= item.phases.length;
    if (!isSameItem || finished) {
      setTimer({ itemId: item.id, phaseIndex: 0, secondsLeft: item.phases[0][1], running: true });
      void requestWakeLock();
      playBeep("phase");
      return;
    }
    if (current.running) {
      setTimer({ ...current, running: false });
      void releaseWakeLock();
    } else {
      setTimer({ ...current, running: true });
      void requestWakeLock();
    }
  }

  function resetTimer(item: BodyProgramItem) {
    if (!item.phases) return;
    void releaseWakeLock();
    setTimer({ itemId: item.id, phaseIndex: 0, secondsLeft: item.phases[0][1], running: false });
  }

  function selectSection(next: BodyProgramSection) {
    if (timer) {
      void releaseWakeLock();
      setTimer(null);
    }
    setOpenCards({});
    setSection(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleExport() {
    const json = JSON.stringify(state, null, 2);
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      setDump(null);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setDump(json);
    }
  }

  if (!hydrated) return null;

  const today = localDateKey(new Date());
  const todayRecord = dayRecord(state, today);
  const rootStyle = { "--bp-accent": SECTION_ACCENT[section] } as CSSProperties;

  return (
    <div className="mx-auto w-full max-w-[640px]" style={rootStyle}>
      <header className="pb-3.5 pt-1">
        <div className="font-mono text-[10px] font-bold uppercase tracking-[.22em] text-faint">✦ Daily practice</div>
        <h1 className="mt-2 font-display text-[32px] font-extrabold leading-[.98] tracking-[-.02em] text-ink">
          Practice
        </h1>
        <div
          className="body-principle mt-4 rounded-lg border-l-[3px] bg-surface p-[13px_15px] text-[14.5px] text-muted transition-colors"
          style={{ borderLeftColor: "var(--bp-accent)" }}
          dangerouslySetInnerHTML={{ __html: PRINCIPLE[section] }}
        />
      </header>

      <WeekStrip state={state} weekOffset={weekOffset} onGoWeek={goWeek} />
      <Meter section={section} state={state} todayKey={today} />
      <Tabs section={section} onSelect={selectSection} />

      {section === "notes" ? (
        <NotesPanel state={state} copied={copied} dump={dump} onExport={handleExport} />
      ) : (
        <>
          {DATA[section].map((entry, i) =>
            isGroupHeading(entry) ? (
              <GroupHeading key={`g-${i}`} label={entry.group} />
            ) : (
              <ExerciseCard
                key={entry.id}
                item={entry}
                done={!!todayRecord.checks[entry.id]}
                open={!!openCards[entry.id]}
                isTiming={!!timer && timer.itemId === entry.id && timer.running}
                timerState={timer && timer.itemId === entry.id ? timer : null}
                onToggleCheck={() => toggleCheck(entry)}
                onToggleOpen={() => toggleOpen(entry.id)}
                onStartTimer={() => toggleTimer(entry)}
                onResetTimer={() => resetTimer(entry)}
              />
            )
          )}
          <LogBox state={state} todayKey={today} onSetFeel={setFeelToday} />
        </>
      )}

      <footer className="my-8 text-center font-mono text-[10px] uppercase tracking-[.16em] text-faint">
        ✦ stay out of end range ✦
      </footer>
    </div>
  );
}

// ── Week strip ────────────────────────────────────────────────────────────

function WeekStrip({
  state,
  weekOffset,
  onGoWeek,
}: {
  state: BodyProgramState;
  weekOffset: number;
  onGoWeek: (delta: number) => void;
}) {
  const dates = weekDateKeys(weekOffset);
  const today = localDateKey(new Date());
  const label = weekLabel(weekOffset, dates);

  let totalHit = 0;
  const rows = TRACKS.map((track) => {
    const hits = dates.map((d) => trackDoneOnDate(state, track, d));
    const n = hits.filter(Boolean).length;
    const target = TRACK_TARGET[track];
    const met = n >= target;
    if (met) totalHit++;
    return { track, hits, n, target, met };
  });

  const flareCount = dates.filter((d) => state.days[d]?.feel === "flared").length;

  return (
    <section className="mb-1 mt-[18px] rounded-lg border border-border bg-surface px-[15px] py-3.5">
      <div className="mb-[11px] flex items-baseline justify-between">
        <b className="font-mono text-[10px] font-bold uppercase tracking-[.18em] text-muted">{label}</b>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => onGoWeek(-1)}
            aria-label="Previous week"
            className="h-[22px] w-[26px] rounded border border-border font-mono text-[11px] text-muted hover:text-ink"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => onGoWeek(1)}
            disabled={weekOffset >= 0}
            aria-label="Next week"
            className="h-[22px] w-[26px] rounded border border-border font-mono text-[11px] text-muted hover:text-ink disabled:opacity-30"
          >
            ›
          </button>
        </div>
      </div>

      <div className="mb-[7px] grid grid-cols-[20px_repeat(7,1fr)_34px] items-center gap-[5px]">
        <span />
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <span key={i} className="text-center font-mono text-[9px] tracking-[.06em] text-faint">
            {d}
          </span>
        ))}
        <span />
      </div>

      {rows.map(({ track, hits, n, target, met }) => (
        <div key={track} className="mb-1.5 grid grid-cols-[20px_repeat(7,1fr)_34px] items-center gap-[5px]">
          <div className={`font-mono text-[10px] font-bold ${TRACK_TEXT_CLASS[track]}`}>{TRACK_SHORT_LABEL[track]}</div>
          {hits.map((on, i) => {
            const isToday = dates[i] === today;
            return (
              <div
                key={i}
                className={[
                  "h-5 rounded border",
                  on ? `${TRACK_BG_CLASS[track]} ${TRACK_BORDER_CLASS[track]}` : "border-transparent bg-canvas",
                  isToday ? "ring-1 ring-inset ring-ink/30" : "",
                ].join(" ")}
              />
            );
          })}
          <div className={`text-right font-mono text-[11px] ${met ? "text-ink" : "text-faint"}`}>
            {n}/{target}
          </div>
        </div>
      ))}

      <div className="mt-2.5 border-t border-border pt-2.5 font-mono text-[10px] tracking-[.05em] text-faint">
        {totalHit === 3 ? "✦ ALL THREE TARGETS MET" : `${totalHit}/3 TARGETS MET`}
        {flareCount ? `  ·  ${flareCount} FLARE${flareCount > 1 ? "S" : ""} LOGGED` : ""}
      </div>
    </section>
  );
}

// ── Meter ─────────────────────────────────────────────────────────────────

function Meter({
  section,
  state,
  todayKey,
}: {
  section: BodyProgramSection;
  state: BodyProgramState;
  todayKey: string;
}) {
  if (section === "notes") return <div className="min-h-[26px]" />;
  const items = countedItems(section);
  const rec = dayRecord(state, todayKey);
  const done = items.filter((i) => rec.checks[i.id]).length;
  return (
    <div className="my-3.5 flex min-h-[26px] items-baseline gap-2.5">
      <div className="font-mono text-[19px] tracking-[.12em] text-[var(--bp-accent)] transition-colors">
        {items.map((i) => (
          <span key={i.id} className={rec.checks[i.id] ? "" : "text-faint"}>
            {rec.checks[i.id] ? "✦" : "✧"}
          </span>
        ))}
      </div>
      <div className="font-mono text-[10px] font-bold uppercase tracking-[.16em] text-muted">
        {done === items.length ? "Session complete" : `${done} of ${items.length} today`}
      </div>
    </div>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────────────

function Tabs({ section, onSelect }: { section: BodyProgramSection; onSelect: (s: BodyProgramSection) => void }) {
  return (
    <div role="tablist" className="my-5 flex gap-1.5">
      {TABS.map((tab) => {
        const active = tab.id === section;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(tab.id)}
            className={[
              "flex-1 rounded-lg border px-1 py-2.5 font-mono text-[10.5px] font-bold uppercase tracking-[.1em] transition-colors",
              active
                ? "border-[var(--bp-accent)] bg-[var(--bp-accent)] text-white"
                : "border-border text-muted hover:text-ink",
            ].join(" ")}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Group heading ─────────────────────────────────────────────────────────

function GroupHeading({ label }: { label: string }) {
  return (
    <div className="my-[22px] flex items-center gap-2.5 first:mt-0">
      <span className="whitespace-nowrap font-mono text-[10px] font-bold uppercase tracking-[.18em] text-muted">
        {label}
      </span>
      <i className="h-px flex-1 bg-border not-italic" />
    </div>
  );
}

// ── Exercise card ─────────────────────────────────────────────────────────

function ExerciseCard({
  item,
  done,
  open,
  isTiming,
  timerState,
  onToggleCheck,
  onToggleOpen,
  onStartTimer,
  onResetTimer,
}: {
  item: BodyProgramItem;
  done: boolean;
  open: boolean;
  isTiming: boolean;
  timerState: TimerState | null;
  onToggleCheck: () => void;
  onToggleOpen: () => void;
  onStartTimer: () => void;
  onResetTimer: () => void;
}) {
  return (
    <article
      className={[
        "mb-2 overflow-hidden rounded-lg border bg-surface transition-colors",
        isTiming ? "border-[var(--bp-accent)]" : done ? "border-[var(--bp-accent)]/40" : "border-border",
      ].join(" ")}
    >
      <div className="flex items-start gap-3 p-3.5">
        <button
          type="button"
          aria-pressed={done}
          aria-label={`Mark ${item.name} done`}
          onClick={onToggleCheck}
          className={[
            "mt-px grid h-[26px] w-[26px] flex-none place-items-center rounded-full border-[1.5px] transition-colors",
            done ? "border-[var(--bp-accent)] bg-[var(--bp-accent)]" : "border-border bg-transparent",
          ].join(" ")}
        >
          {done && (
            <svg viewBox="0 0 24 24" className="h-3 w-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
              <path d="m5 12 5 5 9-9" />
            </svg>
          )}
        </button>
        <div className="min-w-0 flex-1 cursor-pointer" onClick={onToggleOpen}>
          <div className="font-mono text-[9.5px] font-bold uppercase tracking-[.14em] text-[var(--bp-accent)] transition-colors">
            {item.meta}
          </div>
          <div className={`mt-[3px] font-display text-[17.5px] font-bold leading-[1.22] tracking-[-.01em] ${done ? "text-muted" : "text-ink"}`}>
            {item.name}
          </div>
        </div>
        <div className={`flex-none self-center text-[11px] text-faint transition-transform ${open ? "rotate-180" : ""}`}>
          ▾
        </div>
      </div>
      {open && (
        <div className="px-3.5 pb-[15px] pl-[53px] text-[14.5px] text-muted">
          <div className="body-detail" dangerouslySetInnerHTML={{ __html: item.body }} />
          {item.phases && (
            <TimerBlock item={item} timerState={timerState} onStart={onStartTimer} onReset={onResetTimer} />
          )}
        </div>
      )}
    </article>
  );
}

// ── Timer ─────────────────────────────────────────────────────────────────

function TimerBlock({
  item,
  timerState,
  onStart,
  onReset,
}: {
  item: BodyProgramItem;
  timerState: TimerState | null;
  onStart: () => void;
  onReset: () => void;
}) {
  const phases = item.phases;
  if (!phases) return null;

  const totalSeconds = phases.reduce((sum, p) => sum + p[1], 0);
  const started = timerState !== null;
  const finished = !!timerState && timerState.phaseIndex >= phases.length;
  const active = timerState && !finished ? timerState : null;
  const phaseIndex = active?.phaseIndex ?? 0;
  const [phaseLabel, phaseSeconds] = phases[phaseIndex];
  const secondsLeft = active?.secondsLeft ?? phases[0][1];
  const running = active?.running ?? false;

  const timeText = finished ? "0:00" : formatClock(secondsLeft);
  const phaseText = finished ? "Complete ✦" : phaseLabel;
  const ofText = finished ? "" : phases.length > 1 ? `${phaseIndex + 1}/${phases.length}` : started ? "" : formatClock(totalSeconds);
  const fillPct = finished ? 100 : active ? Math.round((100 * (phaseSeconds - secondsLeft)) / phaseSeconds) : 0;
  const buttonLabel = finished ? "Start again" : running ? "Pause" : "Start";
  const buttonPrimary = !finished && !running;

  return (
    <div className="mt-[13px] rounded-lg border border-border bg-canvas p-[13px]">
      <div className="mb-2 flex items-baseline justify-between gap-2.5">
        <div className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[10px] font-bold uppercase tracking-[.13em] text-[var(--bp-accent)]">
          {phaseText}
        </div>
        <div className="flex-none font-mono text-[10px] text-faint">{ofText}</div>
      </div>
      <div className={`font-mono text-[38px] font-bold leading-none tracking-[.01em] tabular-nums ${finished ? "text-[var(--bp-accent)]" : "text-ink"}`}>
        {timeText}
      </div>
      <div className="my-[10px] h-[3px] overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-[var(--bp-accent)] transition-[width] duration-[950ms] ease-linear"
          style={{ width: `${fillPct}%` }}
        />
      </div>
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={onStart}
          className={
            buttonPrimary
              ? "flex-1 rounded-md bg-[var(--bp-accent)] px-1.5 py-2.5 font-mono text-[10.5px] font-bold uppercase tracking-[.12em] text-white"
              : "flex-1 rounded-md border border-[var(--bp-accent)] px-1.5 py-2.5 font-mono text-[10.5px] font-bold uppercase tracking-[.12em] text-[var(--bp-accent)]"
          }
        >
          {buttonLabel}
        </button>
        <button
          type="button"
          onClick={onReset}
          className="w-[82px] flex-none rounded-md border border-border px-1.5 py-2.5 font-mono text-[10.5px] font-bold uppercase tracking-[.12em] text-muted"
        >
          Reset
        </button>
      </div>
    </div>
  );
}

// ── Log box + history ────────────────────────────────────────────────────

function HistoryList({ state }: { state: BodyProgramState }) {
  const keys = Object.keys(state.days)
    .filter((k) => state.days[k].feel)
    .sort()
    .reverse()
    .slice(0, 5);

  if (keys.length === 0) {
    return (
      <div className="mt-[13px] font-mono text-[11px] leading-[1.9] text-muted">
        No entries yet — logging a few builds the picture of what your body does 24–48 hrs after.
      </div>
    );
  }

  return (
    <div className="mt-[13px] font-mono text-[11px] leading-[1.9] text-muted">
      {keys.map((k) => (
        <div key={k}>
          {parseLocalDateKey(k)
            .toLocaleDateString(undefined, { month: "short", day: "numeric" })
            .toUpperCase()}
          {" — "}
          <b className="font-normal text-ink">{state.days[k].feel}</b>
        </div>
      ))}
    </div>
  );
}

function LogBox({
  state,
  todayKey,
  onSetFeel,
}: {
  state: BodyProgramState;
  todayKey: string;
  onSetFeel: (feel: BodyProgramFeel) => void;
}) {
  const rec = dayRecord(state, todayKey);
  const options: { id: BodyProgramFeel; label: string }[] = [
    { id: "easier", label: "Easier" },
    { id: "same", label: "Same" },
    { id: "flared", label: "Flared" },
  ];

  return (
    <div className="mb-2 mt-[26px] rounded-lg border border-dashed border-border p-4">
      <div className="mb-3 font-display text-base font-bold text-ink">How did that land?</div>
      <div className="flex gap-1.5">
        {options.map((opt) => {
          const active = rec.feel === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              aria-pressed={active}
              onClick={() => onSetFeel(opt.id)}
              className={[
                "flex-1 rounded-md border px-1 py-2.5 font-mono text-[10px] font-bold uppercase tracking-[.08em] transition-colors",
                active ? "border-ink bg-ink text-canvas" : "border-border text-muted",
              ].join(" ")}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      <HistoryList state={state} />
    </div>
  );
}

// ── Notes ─────────────────────────────────────────────────────────────────

function NotesPanel({
  state,
  copied,
  dump,
  onExport,
}: {
  state: BodyProgramState;
  copied: boolean;
  dump: string | null;
  onExport: () => void;
}) {
  return (
    <div>
      <div dangerouslySetInnerHTML={{ __html: NOTES_HTML }} />
      <div className="body-note">
        <h3>Export ✦</h3>
        <p>Everything lives in one JSON object keyed by date, so it can move into a bigger system later without a rewrite.</p>
        <button
          type="button"
          onClick={onExport}
          className="mt-2.5 w-full rounded-md border border-touring px-3 py-3 font-mono text-[10.5px] font-bold uppercase tracking-[.12em] text-touring transition-colors active:bg-touring-soft"
        >
          {copied ? "Copied ✦" : "Copy data as JSON"}
        </button>
        {dump && (
          <pre className="mt-2.5 max-h-[200px] overflow-auto whitespace-pre-wrap break-all rounded-md bg-canvas p-3 font-mono text-[10px] text-muted">
            {dump}
          </pre>
        )}
      </div>
      <div className="body-note">
        <h3>Practice history</h3>
        <HistoryList state={state} />
      </div>
    </div>
  );
}
