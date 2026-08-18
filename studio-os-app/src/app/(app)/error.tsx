"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Route-level failure inside the app shell.
 *
 * Principle 9 — announce degradation loudly. A white screen is the loudest
 * possible version of looking fine while broken, so this says plainly what
 * happened and, just as importantly, what is *not* lost: nothing here writes
 * to storage, so the vault is untouched by whatever threw.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Studio OS route error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6">
        <h1 className="font-display text-lg text-ink">This screen didn&apos;t load.</h1>

        <p className="mt-2 text-sm text-muted">
          Something broke while rendering. Your tasks, journal and settings are stored
          separately and were not touched — nothing has been lost.
        </p>

        {error.digest && (
          <p className="mt-3 font-mono text-[11px] text-muted">Ref: {error.digest}</p>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            onClick={reset}
            className="rounded-md border border-border px-3 py-1.5 text-sm text-ink hover:border-accent hover:text-accent"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-md border border-border px-3 py-1.5 text-sm text-muted hover:border-accent hover:text-accent"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
