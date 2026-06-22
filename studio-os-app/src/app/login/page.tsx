"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { BrandMark } from "@/components/icons";

export default function LoginPage() {
  const [busy, setBusy] = useState(false);

  async function signInWithGoogle() {
    setBusy(true);
    try {
      const supabase = createClient();
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          scopes:
            "https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file",
          queryParams: { access_type: "offline", prompt: "consent" },
        },
      });
    } catch {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-canvas px-6">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-8 text-center">
        <span className="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-xl bg-accent text-white">
          <BrandMark className="h-7 w-7" />
        </span>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">Studio OS</h1>
        <p className="mt-2 text-sm text-muted">
          A calm home for your tasks, projects, and deadlines.
        </p>

        {hasSupabaseEnv ? (
          <button
            type="button"
            onClick={signInWithGoogle}
            disabled={busy}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-ink disabled:opacity-60"
          >
            {busy ? "Opening Google…" : "Continue with Google"}
          </button>
        ) : (
          <div className="mt-6 rounded-lg border border-border bg-surface-2 p-4 text-left">
            <p className="text-sm font-medium text-ink">Sign-in not connected yet</p>
            <p className="mt-1 text-xs text-muted">
              Add your Supabase keys to <code>.env.local</code> to enable Google sign-in. The app
              shell is browsable in the meantime.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
