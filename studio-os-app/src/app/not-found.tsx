import Link from "next/link";

/**
 * 404. Reachable from stale bookmarks, old push notification deep links, and
 * task/project URLs whose row has since been deleted — so the copy assumes a
 * dead link rather than user error.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6">
        <h1 className="font-display text-lg text-ink">That page isn&apos;t here.</h1>

        <p className="mt-2 text-sm text-muted">
          The link may be out of date, or it pointed at something that has since been
          archived or deleted. Nothing has gone wrong with your data.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href="/"
            className="rounded-md border border-border px-3 py-1.5 text-sm text-ink hover:border-accent hover:text-accent"
          >
            Dashboard
          </Link>
          <Link
            href="/today"
            className="rounded-md border border-border px-3 py-1.5 text-sm text-muted hover:border-accent hover:text-accent"
          >
            Today
          </Link>
        </div>
      </div>
    </div>
  );
}
