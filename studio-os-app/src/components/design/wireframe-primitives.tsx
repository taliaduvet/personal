/**
 * Functional layout wireframes — shared building blocks.
 * Ugly on purpose. Labels > aesthetics.
 *
 * Rules baked in from the round-two critique:
 * - The app shell is drawn ONCE (ShellOnce). Every other frame is content-only.
 * - Frames render at true content proportions (desktop content ≈ 1160px).
 * - No poetry in functional chrome; annotations say what/why in plain words.
 */

export function Anno({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={["text-[10px] font-semibold uppercase tracking-wider text-faint", className].join(" ")}>
      {children}
    </p>
  );
}

export function Tap({ children }: { children: React.ReactNode }) {
  return <span className="text-[11px] font-medium text-accent">↗ {children}</span>;
}

/** Content-only desktop frame. The sidebar/top bar exist but are NOT redrawn. */
export function Frame({
  label,
  note,
  children,
}: {
  label: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="w-full max-w-[1160px]">
      <div className="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
        <p className="text-xs font-bold uppercase tracking-wide text-ink">{label}</p>
        {note && <span className="text-xs text-muted">{note}</span>}
      </div>
      <div className="rounded-xl border-2 border-ink/70 bg-surface p-6">{children}</div>
    </div>
  );
}

export function PhoneFrame({
  label,
  note,
  children,
}: {
  label: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="w-[390px] shrink-0">
      <div className="mb-2 flex flex-wrap items-baseline gap-x-2">
        <p className="text-xs font-bold uppercase tracking-wide text-ink">{label}</p>
        {note && <span className="text-xs text-muted">{note}</span>}
      </div>
      <div className="overflow-hidden rounded-[28px] border-2 border-ink/70 bg-surface">
        <div className="flex min-h-[600px] flex-col">
          <div className="flex-1 p-4">{children}</div>
          <TabBar />
        </div>
      </div>
    </div>
  );
}

export function TabBar() {
  const tabs = ["Today", "Tasks", "＋", "Plan", "Review"];
  return (
    <nav className="flex border-t border-border bg-canvas px-2 pb-3 pt-2">
      {tabs.map((t) => (
        <div
          key={t}
          className={[
            "flex flex-1 flex-col items-center text-[10px]",
            t === "＋" ? "text-lg font-bold leading-none text-accent" : "text-muted",
          ].join(" ")}
        >
          {t !== "＋" && <span className="mb-0.5 text-sm leading-none">○</span>}
          {t}
        </div>
      ))}
    </nav>
  );
}

/** Labeled functional zone inside a frame. */
export function Zone({
  label,
  note,
  dashed = false,
  className = "",
  children = null,
}: {
  label: string;
  note?: string;
  dashed?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={[
        "rounded-lg p-3",
        dashed ? "border border-dashed border-faint bg-canvas/60" : "border border-border bg-canvas/30",
        className,
      ].join(" ")}
    >
      <div className="mb-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <Anno>{label}</Anno>
        {note && <span className="text-[11px] text-muted">— {note}</span>}
      </div>
      {children}
    </div>
  );
}

export function TaskRowWire({
  title,
  sub,
  accessories = [],
  state = "open",
}: {
  title: string;
  sub?: string;
  accessories?: string[];
  state?: "open" | "done" | "waiting";
}) {
  return (
    <div
      className={[
        "flex items-center gap-2 border-b border-line py-2 text-sm last:border-0",
        state === "done" ? "opacity-50" : state === "waiting" ? "opacity-70" : "",
      ].join(" ")}
    >
      <span
        className={[
          "h-4 w-4 shrink-0 rounded-full border-2 border-ink",
          state === "done" ? "bg-ink" : state === "waiting" ? "border-dashed" : "",
        ].join(" ")}
      />
      <span className="h-4 w-1 shrink-0 rounded-sm bg-accent" title="life area color" />
      <div className="min-w-0 flex-1">
        <p className={["truncate text-ink", state === "done" ? "line-through" : ""].join(" ")}>{title}</p>
        {sub && <p className="truncate text-xs text-muted">{sub}</p>}
      </div>
      <div className="flex shrink-0 justify-end gap-1">
        {accessories.slice(0, 2).map((a) => (
          <span key={a} className="whitespace-nowrap rounded-full border border-border px-2 py-0.5 text-[10px] text-muted">
            {a}
          </span>
        ))}
      </div>
    </div>
  );
}

export function BalanceBars({ areas }: { areas: [string, number][] }) {
  const max = Math.max(...areas.map(([, n]) => n));
  return (
    <div className="space-y-1.5">
      {areas.map(([name, n]) => (
        <div key={name} className="flex items-center gap-2 text-xs">
          <span className="w-16 shrink-0 truncate text-muted">{name}</span>
          <div className="h-1.5 flex-1 rounded-full bg-canvas">
            <div className="h-full rounded-full bg-accent/60" style={{ width: `${(n / max) * 100}%` }} />
          </div>
          <span className="w-5 shrink-0 text-right text-faint">{n}</span>
        </div>
      ))}
    </div>
  );
}

export function LensTabs({ active }: { active: string }) {
  const lenses = ["by area", "by project", "by when", "by mode", "waiting"];
  return (
    <div className="flex flex-wrap gap-1.5">
      {lenses.map((l) => (
        <span
          key={l}
          className={[
            "rounded-full border px-2.5 py-1 text-xs",
            l === active ? "border-accent bg-accent-soft font-medium text-accent" : "border-border text-muted",
          ].join(" ")}
        >
          {l}
        </span>
      ))}
    </div>
  );
}

export function Placeholder({ lines = 2, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={["space-y-1.5", className].join(" ")}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-2 rounded bg-faint/40" style={{ width: `${88 - i * 18}%` }} />
      ))}
    </div>
  );
}
