"use client";

import { useCallback, useEffect, useState } from "react";
import { localDateKey } from "@/lib/local-date";
import { CLOUD_PULL_EVENT } from "@/components/CloudSyncBridge";

const CACHE_PREFIX = "studio-os.briefing.v1:";

function cacheKey(): string {
  return `${CACHE_PREFIX}${localDateKey(new Date())}`;
}

export function BriefMeCard() {
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const cached = sessionStorage.getItem(cacheKey());
      if (cached) setText(cached);
    } catch {
      /* ignore */
    }
  }, []);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    window.dispatchEvent(new Event(CLOUD_PULL_EVENT));
    await new Promise((r) => setTimeout(r, 400));

    try {
      const res = await fetch("/api/briefing", { method: "POST" });
      const data = (await res.json()) as {
        briefing?: string;
        message?: string;
        error?: string;
        detail?: string;
      };
      if (!res.ok) {
        setError(data.message ?? data.detail ?? "AI unavailable");
        setText(null);
        return;
      }
      const briefing = data.briefing?.trim() ?? "";
      setText(briefing);
      try {
        sessionStorage.setItem(cacheKey(), briefing);
      } catch {
        /* ignore */
      }
    } catch {
      setError("AI unavailable");
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <section className="rounded-xl border border-border bg-surface p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-sm font-semibold text-ink">Briefing</h2>
        <button
          type="button"
          onClick={() => void run()}
          disabled={loading}
          className="rounded-lg border border-border bg-canvas px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-accent disabled:opacity-50"
        >
          {loading ? "Thinking…" : text ? "Refresh brief" : "Brief me"}
        </button>
      </div>
      {error ? <p className="mt-2 text-xs text-muted">{error}</p> : null}
      {text ? (
        <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink/90">{text}</div>
      ) : !error ? (
        <p className="mt-2 text-xs text-muted">
          Gemini looks at your whole vault — tasks, replies, projects, deadlines, logbook — then helps you prioritize
          and defer. Not a guilt list.
        </p>
      ) : null}
    </section>
  );
}
