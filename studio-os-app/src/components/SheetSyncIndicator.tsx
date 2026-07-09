"use client";

import { useSheet } from "@/lib/sheet-store";

function formatSyncTime(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function SheetSyncIndicator() {
  const { connection, writeStatus, writeError } = useSheet();
  if (!connection) return null;

  const tone =
    writeStatus === "error"
      ? "text-[#bc6740]"
      : writeStatus === "syncing" || writeStatus === "pending"
        ? "text-muted"
        : "text-faint";

  const dot =
    writeStatus === "error"
      ? "bg-[#bc6740]"
      : writeStatus === "syncing" || writeStatus === "pending"
        ? "bg-accent animate-pulse"
        : "bg-[#3c8262]";

  const label =
    writeStatus === "error"
      ? "Save failed"
      : writeStatus === "syncing"
        ? "Saving…"
        : writeStatus === "pending"
          ? "Unsaved…"
          : connection.lastSyncAt
            ? `Synced ${formatSyncTime(connection.lastSyncAt)}`
            : "Connected";

  return (
    <div
      className={["hidden items-center gap-1.5 text-xs sm:flex", tone].join(" ")}
      title={writeError ?? undefined}
    >
      <span className={["h-1.5 w-1.5 rounded-full", dot].join(" ")} />
      <span>{label}</span>
    </div>
  );
}
