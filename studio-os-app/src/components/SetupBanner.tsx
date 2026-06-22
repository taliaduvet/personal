"use client";

import Link from "next/link";
import { useSheet } from "@/lib/sheet-store";

export function SetupBanner() {
  const { connection } = useSheet();
  if (connection) return null;

  return (
    <div className="rounded-xl border border-accent/30 bg-accent-soft/50 px-4 py-3">
      <p className="text-sm font-medium text-ink">You&apos;re viewing sample tasks</p>
      <p className="mt-1 text-xs text-muted">
        Connect your Studio OS sheet to load your real projects and tasks — the sheet stays the
        source of truth.
      </p>
      <Link
        href="/settings"
        className="mt-2 inline-flex rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-ink"
      >
        Set up your sheet →
      </Link>
    </div>
  );
}
