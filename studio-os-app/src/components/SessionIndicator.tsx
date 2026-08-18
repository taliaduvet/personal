"use client";

import { useRouter } from "next/navigation";
import { useSessions } from "@/lib/sessions-store";
import { openTaskWork } from "@/lib/navigation";
import { formatSessionElapsed } from "@/lib/sessions";

export function SessionIndicator({ className = "" }: { className?: string }) {
  const router = useRouter();
  const { activeSession, activeTaskTitle, elapsedMs, elapsedLabel } = useSessions();

  if (!activeSession) return null;

  const title = activeTaskTitle?.trim() || "In session";
  const shortTitle = title.length > 36 ? `${title.slice(0, 35)}…` : title;

  const target = activeSession.targetDurationMs;
  const remainingMs = target ? target - elapsedMs : null;
  const isOver = remainingMs !== null && remainingMs < 0;
  const timeLabel = target
    ? isOver
      ? `+${formatSessionElapsed(-remainingMs!)} over`
      : formatSessionElapsed(remainingMs!)
    : elapsedLabel;
  const pct = target ? Math.min(100, Math.max(0, Math.round((elapsedMs / target) * 100))) : 0;

  const tone = isOver ? "danger" : activeSession.warningFiredAtIso ? "promo" : "accent";
  const toneClasses = {
    accent: { border: "border-accent/35", bg: "bg-accent-soft/60", hoverBorder: "hover:border-accent", hoverBg: "hover:bg-accent-soft", text: "text-accent", dot: "bg-accent", fill: "bg-accent" },
    promo: { border: "border-promo/35", bg: "bg-promo-soft/60", hoverBorder: "hover:border-promo", hoverBg: "hover:bg-promo-soft", text: "text-promo", dot: "bg-promo", fill: "bg-promo" },
    danger: { border: "border-danger/35", bg: "bg-danger/10", hoverBorder: "hover:border-danger", hoverBg: "hover:bg-danger/15", text: "text-danger", dot: "bg-danger", fill: "bg-danger" },
  }[tone];

  return (
    <button
      type="button"
      onClick={() => openTaskWork(router, activeSession.taskId)}
      className={[
        "inline-flex max-w-full flex-col gap-1 rounded-full border px-3 py-1 text-left text-xs font-medium transition-colors",
        toneClasses.border,
        toneClasses.bg,
        toneClasses.hoverBorder,
        toneClasses.hoverBg,
        toneClasses.text,
        className,
      ].join(" ")}
      aria-label={`Return to session on ${title}`}
    >
      <span className="inline-flex items-center gap-2">
        <span className={["h-1.5 w-1.5 shrink-0 rounded-full", toneClasses.dot].join(" ")} aria-hidden />
        <span className="truncate">sitting with · {shortTitle}</span>
        <span className="shrink-0 text-faint">{timeLabel}</span>
      </span>
      {target && (
        <span className="h-0.5 w-full overflow-hidden rounded-full bg-border">
          <span
            className={["block h-full rounded-full transition-[width]", toneClasses.fill].join(" ")}
            style={{ width: `${pct}%` }}
          />
        </span>
      )}
    </button>
  );
}
