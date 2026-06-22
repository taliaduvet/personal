"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { BrandMark } from "@/components/icons";

type Mode = "password" | "magic";

export default function LoginPage() {
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function signInWithEmail(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const supabase = createClient();

    if (mode === "magic") {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      setMessage(error ? error.message : "Check your email for a sign-in link.");
      setBusy(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMessage(error.message);
      setBusy(false);
      return;
    }
    window.location.href = "/";
  }

  async function signInWithGoogle() {
    setBusy(true);
    setMessage(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          scopes:
            "https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/calendar.readonly",
          queryParams: { access_type: "offline", prompt: "consent" },
        },
      });
      if (error) {
        setMessage(
          error.message.includes("not enabled")
            ? "Google sign-in isn’t turned on for this Supabase project yet. Use email sign-in below, then connect Calendar in Settings or week planning."
            : error.message
        );
        setBusy(false);
      }
    } catch {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-canvas px-6">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-8">
        <div className="text-center">
          <span className="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-xl bg-accent text-white">
            <BrandMark className="h-7 w-7" />
          </span>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">Studio OS</h1>
          <p className="mt-2 text-sm text-muted">
            A calm home for your tasks, projects, and deadlines.
          </p>
        </div>

        {hasSupabaseEnv ? (
          <div className="mt-6 space-y-4">
            <form onSubmit={signInWithEmail} className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                required
                className="w-full rounded-lg border border-border bg-canvas px-3 py-2.5 text-sm text-ink outline-none focus:border-accent"
              />
              {mode === "password" && (
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-border bg-canvas px-3 py-2.5 text-sm text-ink outline-none focus:border-accent"
                />
              )}
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-lg bg-accent py-2.5 text-sm font-medium text-white hover:bg-accent-ink disabled:opacity-60"
              >
                {busy ? "…" : mode === "magic" ? "Send magic link" : "Sign in"}
              </button>
            </form>

            <button
              type="button"
              onClick={() => {
                setMode(mode === "magic" ? "password" : "magic");
                setMessage(null);
              }}
              className="w-full text-center text-xs text-muted hover:text-ink"
            >
              {mode === "magic" ? "Use password instead" : "Use magic link instead"}
            </button>

            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-line" />
              </div>
              <p className="relative mx-auto w-fit bg-surface px-2 text-[10px] uppercase tracking-wide text-faint">
                or
              </p>
            </div>

            <button
              type="button"
              onClick={signInWithGoogle}
              disabled={busy}
              className="w-full rounded-lg border border-border py-2.5 text-sm font-medium text-ink hover:border-accent disabled:opacity-60"
            >
              Continue with Google
            </button>

            {message && (
              <p className="text-center text-xs leading-relaxed text-muted">{message}</p>
            )}

            <p className="text-center text-[11px] leading-relaxed text-faint">
              Calendar for week planning connects separately in Settings — no Google app login required.
            </p>
          </div>
        ) : (
          <div className="mt-6 rounded-lg border border-border bg-surface-2 p-4 text-left">
            <p className="text-sm font-medium text-ink">Sign-in not connected yet</p>
            <p className="mt-1 text-xs text-muted">
              Add your Supabase keys to <code>.env.local</code>. The app shell is browsable in the meantime.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
