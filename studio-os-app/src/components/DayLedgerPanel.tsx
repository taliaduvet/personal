"use client";

import { formatLocalTime } from "@/lib/local-date";
import type { DayLedger } from "@/lib/day-ledger";
import { formatLedgerEventTime } from "@/lib/day-ledger";

export type DayLedgerPanelProps = {
  ledger: DayLedger;
};

function SectionHead({ title, muted }: { title: string; muted?: boolean }) {
  return (
    <h3
      className={[
        "text-[10px] font-bold uppercase tracking-wider",
        muted ? "text-faint" : "text-muted",
      ].join(" ")}
    >
      {title}
    </h3>
  );
}

export function DayLedgerPanel({ ledger }: DayLedgerPanelProps) {
  if (ledger.isEmpty) {
    return (
      <div className="rounded-xl border border-dashed border-faint/70 bg-canvas/30 px-4 py-6 text-center">
        <p className="text-sm text-muted">Quiet day — no signal yet</p>
        <p className="mt-1 text-xs text-faint">Calendar, sessions, and ships will show up here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-surface px-4 py-4 shadow-sm">
      <div>
        <h2 className="font-display text-sm font-semibold text-ink">Today&apos;s ledger</h2>
        <p className="mt-0.5 text-xs text-muted">Read-only — what the system actually knows</p>
      </div>

      {ledger.sections.map((section, i) => {
        switch (section.kind) {
          case "calendar":
            return (
              <div key={`cal-${i}`} className="space-y-2">
                <SectionHead title="Calendar" />
                {section.blocked ? (
                  <p className="text-xs text-muted">All-day event blocks the day</p>
                ) : null}
                {section.allDayEvents.map((ev) => (
                  <p key={ev.id} className="text-sm text-ink">
                    {ev.summary}
                    <span className="ml-2 text-xs text-faint">all day</span>
                  </p>
                ))}
                {section.timedEvents.map((ev) => (
                  <p key={ev.id} className="text-sm text-ink">
                    {ev.summary}
                    <span className="ml-2 text-xs text-faint">{formatLedgerEventTime(ev)}</span>
                  </p>
                ))}
              </div>
            );

          case "shape":
            return (
              <div key={`shape-${i}`} className="space-y-2">
                <SectionHead title="Shape" />
                {section.note ? <p className="text-sm italic text-muted">{section.note}</p> : null}
                {section.blocks.map((block) => (
                  <div key={block.block}>
                    <p className="text-xs font-medium text-muted">{block.label}</p>
                    <ul className="mt-0.5 space-y-0.5">
                      {block.taskTitles.map((title, j) => (
                        <li key={j} className="text-sm text-ink">
                          {title}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            );

          case "shipped":
            return (
              <div key={`ship-${i}`} className="space-y-2">
                <SectionHead title="Shipped" />
                {section.items.map((item) => (
                  <p key={item.taskId + item.atIso} className="text-sm text-ink">
                    {item.title}
                    <span className="ml-2 text-xs text-faint">{item.attribution}</span>
                  </p>
                ))}
              </div>
            );

          case "sessions":
            return (
              <div key={`sess-${i}`} className="space-y-2">
                <SectionHead title="Logged sessions" />
                {section.items.map((item) => (
                  <p key={item.taskId + item.atIso} className="text-sm text-ink">
                    {item.title}
                    <span className="ml-2 text-xs font-medium text-muted">{item.durationLabel}</span>
                    <span className="ml-2 text-xs text-faint">
                      {formatLocalTime(new Date(item.atIso).getTime())}
                    </span>
                  </p>
                ))}
              </div>
            );

          case "stated":
            return (
              <div key={`stated-${i}`} className="space-y-1">
                <SectionHead title="You stated" muted />
                {section.durationMs > 0 ? (
                  <p className="text-sm text-faint">
                    ~{section.durationLabel} unlogged studio time
                    {section.taskTitle ? (
                      <span className="text-muted"> · {section.taskTitle}</span>
                    ) : null}
                  </p>
                ) : null}
                {section.reviewNote ? (
                  <p className="text-sm italic text-muted">{section.reviewNote}</p>
                ) : null}
              </div>
            );

          case "gaps":
            return (
              <div key={`gap-${i}`} className="rounded-lg border border-dashed border-faint/60 px-3 py-2">
                <SectionHead title="No signal" muted />
                <p className="mt-1 text-xs text-faint">{section.label}</p>
              </div>
            );

          default:
            return null;
        }
      })}
    </div>
  );
}
