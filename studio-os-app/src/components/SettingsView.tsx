"use client";

import { useSettings } from "@/lib/settings-store";
import { WEEK_START_OPTIONS } from "@/lib/week";
import { CalendarConnect } from "@/components/CalendarConnect";

export function SettingsView() {
  const { weekStartsOn, setWeekStartsOn } = useSettings();

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">Settings</h1>
        <p className="mt-1 text-muted">How your week is shaped — planning, review, and calendars all follow this.</p>
      </header>

      <div className="rounded-xl border border-border bg-surface p-4">
        <h2 className="font-display text-base font-semibold text-ink">Week starts on</h2>
        <p className="mt-1 text-sm text-muted">
          Your planning ritual, weekly review window, and calendar week gutters all use this day.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {WEEK_START_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setWeekStartsOn(opt.value)}
              className={[
                "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                weekStartsOn === opt.value
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-border text-muted hover:border-accent hover:text-ink",
              ].join(" ")}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-4">
        <h2 className="font-display text-base font-semibold text-ink">Google Calendar</h2>
        <p className="mt-1 text-sm text-muted">
          Read-only — shows commitment hours when you plan your week. Separate from app sign-in.
        </p>
        <div className="mt-3">
          <CalendarConnect />
        </div>
      </div>

      <p className="text-xs text-faint">
        More settings (accent, Sheet link, review timing) coming soon.
      </p>
    </section>
  );
}
