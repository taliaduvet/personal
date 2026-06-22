"use client";

import { useSettings } from "@/lib/settings-store";
import { WEEK_START_OPTIONS } from "@/lib/week";
import { GoogleConnect } from "@/components/GoogleConnect";
import { LifeAreasSettings } from "@/components/LifeAreasSettings";
import { SheetConnect } from "@/components/SheetConnect";

export function SettingsView() {
  const { weekStartsOn, setWeekStartsOn, lifeAreas, upsertLifeArea, removeLifeArea } = useSettings();

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

      <LifeAreasSettings lifeAreas={lifeAreas} onSave={upsertLifeArea} onRemove={removeLifeArea} />

      <div className="rounded-xl border border-border bg-surface p-4">
        <h2 className="font-display text-base font-semibold text-ink">Google account</h2>
        <p className="mt-1 text-sm text-muted">
          Calendar, Drive picker, Contacts, and Sheet API access — one connection.
        </p>
        <div className="mt-3">
          <GoogleConnect />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-4">
        <h2 className="font-display text-base font-semibold text-ink">Studio OS Sheet</h2>
        <p className="mt-1 text-sm text-muted">
          Your tasks and projects live in Google Sheets — connect your copy to load real data.
        </p>
        <div className="mt-3">
          <SheetConnect />
        </div>
      </div>

      <p className="text-xs text-faint">
        Sheet settings (accent, review timing) sync from your _Settings tab on pull.
      </p>
    </section>
  );
}
