"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase/session";
import { subscribeCloudSyncStatus, type CloudSyncStatus } from "@/lib/supabase/cloud-push-queue";

/**
 * Account card: who's signed in, cloud sync status, sign in/out.
 * Renders nothing when Supabase isn't configured.
 */
export function AccountSection() {
  const [email, setEmail] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [syncStatus, setSyncStatus] = useState<CloudSyncStatus>("idle");
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setChecked(true);
      return;
    }
    let cancelled = false;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      setEmail(session?.user?.email ?? null);
      setChecked(true);
    });
    const unsub = subscribeCloudSyncStatus((status, message) => {
      setSyncStatus(status);
      setSyncMessage(status === "error" ? (message ?? "Sync error") : null);
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  const supabase = getSupabase();
  if (!supabase || !checked) return null;

  async function signOut() {
    await getSupabase()?.auth.signOut();
    window.location.href = "/login";
  }

  const statusLabel =
    syncStatus === "idle"
      ? "Synced"
      : syncStatus === "error"
        ? (syncMessage ?? "Sync error")
        : "Syncing…";

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <h2 className="font-display text-base font-semibold text-ink">Account</h2>
      {email ? (
        <>
          <p className="mt-1 text-sm text-muted">
            Signed in as <span className="font-medium text-ink">{email}</span> — your data saves
            to your account and follows you across devices.
          </p>
          <p className="mt-1 text-xs text-faint">Cloud sync: {statusLabel}</p>
          <button
            type="button"
            onClick={signOut}
            className="mt-3 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted hover:border-accent hover:text-ink"
          >
            Sign out
          </button>
        </>
      ) : (
        <>
          <p className="mt-1 text-sm text-muted">
            Not signed in — data stays on this device only. Sign in to back it up and sync across
            devices.
          </p>
          <a
            href="/login"
            className="mt-3 inline-block rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-ink"
          >
            Sign in
          </a>
        </>
      )}
    </div>
  );
}
