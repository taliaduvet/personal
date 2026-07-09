/**
 * DESIGN TARGET — collapsed day shape on Today (not wired to live data yet).
 *
 * After the user shapes their day and closes the panel, the plan should appear
 * as dots along a thin horizontal line under the Today header — not a 3-column
 * text summary. Dots represent calendar events and bench tasks placed in
 * morning / afternoon / evening, positioned proportionally along the day arc.
 *
 * Related: Claude Designs `studio-os-round2-brief.md` §2 (day-arc strip) and §3.6
 * (Day Shape soft timeline). Implement during design / daylight polish — see
 * `docs/BUILD_ROADMAP.md` Phase 2 deferrals.
 */

import { Anno } from "@/components/design/wireframe-primitives";

type Dot = {
  id: string;
  label: string;
  /** 0 = start of day, 1 = end of day (wireframe only) */
  position: number;
  kind: "calendar" | "task";
};

const DEMO_DOTS: Dot[] = [
  { id: "cal-1", label: "label session", position: 0.22, kind: "calendar" },
  { id: "t-1", label: "pay utilities", position: 0.28, kind: "task" },
  { id: "cal-2", label: "venue call", position: 0.58, kind: "calendar" },
  { id: "t-2", label: "schedule distro", position: 0.62, kind: "task" },
];

export function DayShapeCollapsedStripDesign({
  dots = DEMO_DOTS,
  note,
}: {
  dots?: Dot[];
  note?: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-accent/40 bg-accent-soft/10 px-4 py-3">
      <Anno>
        collapsed day shape · design target · dots on a thin line · tap opens shape panel
      </Anno>

      <div className="relative mt-4 px-1 pb-1 pt-6">
        <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-border" aria-hidden />

        <div className="relative flex justify-between text-[9px] font-semibold uppercase tracking-wide text-faint">
          <span>morning</span>
          <span>afternoon</span>
          <span>evening</span>
        </div>

        <div className="relative mt-3 h-8">
          {dots.map((dot) => (
            <div
              key={dot.id}
              className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${dot.position * 100}%` }}
              title={`${dot.label} (${dot.kind})`}
            >
              <span
                className={[
                  "block rounded-full border-2 border-surface shadow-sm",
                  dot.kind === "calendar" ? "h-2.5 w-2.5 bg-muted" : "h-2 w-2 bg-accent",
                ].join(" ")}
              />
            </div>
          ))}
          {/* now-marker — relates to day-arc / daylight engine */}
          <div
            className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent bg-accent-soft shadow-sm"
            style={{ left: "45%" }}
            title="current time (day-arc sun dot — design mode)"
          />
        </div>
      </div>

      {note ? <p className="mt-2 text-center text-xs text-muted">{note}</p> : null}
    </div>
  );
}
