"use client";

import { useRouter } from "next/navigation";
import { useSessions } from "@/lib/sessions-store";
import { openTaskWork } from "@/lib/navigation";

export function SessionIndicator({ className = "" }: { className?: string }) {
  const router = useRouter();
  const { activeSession, activeTaskTitle, elapsedLabel } = useSessions();

  if (!activeSession) return null;

  const title = activeTaskTitle?.trim() || "In session";
  const shortTitle = title.length > 36 ? `${title.slice(0, 35)}…` : title;

  return (
    <button
      type="button"
      onClick={() => openTaskWork(router, activeSession.taskId)}
      className={[
        "inline-flex max-w-full items-center gap-2 rounded-full border border-accent/35 bg-accent-soft/60 px-3 py-1 text-left text-xs font-medium text-accent transition-colors hover:border-accent hover:bg-accent-soft",
        className,
      ].join(" ")}
      aria-label={`Return to session on ${title}`}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
      <span className="truncate">sitting with · {shortTitle}</span>
      <span className="shrink-0 text-faint">{elapsedLabel}</span>
    </button>
  );
}
