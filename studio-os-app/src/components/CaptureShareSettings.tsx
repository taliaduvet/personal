"use client";

import { useEffect, useState } from "react";

type Status = {
  captureConfigured: boolean;
  geminiConfigured: boolean;
  cloudRequired: string;
};

/** Phone Shortcuts must hit production — never localhost. */
const PRODUCTION_ORIGIN =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://studio-os-246.netlify.app";

export function CaptureShareSettings() {
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);
  const captureUrl = `${PRODUCTION_ORIGIN}/api/capture`;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/capture");
        if (!res.ok) {
          if (!cancelled) setError(res.status === 401 ? "Sign in to see capture status." : "Could not load status.");
          return;
        }
        const data = (await res.json()) as Status;
        if (!cancelled) setStatus(data);
      } catch {
        if (!cancelled) setError("Could not load status.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <h2 className="font-display text-lg font-semibold text-ink">Need to respond — iPhone Share</h2>
      <p className="mt-1 text-sm text-muted">
        Share a screenshot (or paste) into Studio OS as a Needs-reply item. Live Netlify + signed-in cloud sync
        required. OCR text is cleaned by Gemini into person + title when configured.
      </p>

      {error ? <p className="mt-3 text-sm text-muted">{error}</p> : null}

      {status ? (
        <ul className="mt-3 space-y-1.5 text-sm text-ink">
          <li>
            Capture API:{" "}
            <span className={status.captureConfigured ? "text-accent" : "text-danger"}>
              {status.captureConfigured ? "configured" : "missing env"}
            </span>
          </li>
          <li>
            Gemini briefing:{" "}
            <span className={status.geminiConfigured ? "text-accent" : "text-muted"}>
              {status.geminiConfigured ? "configured" : "missing GEMINI_API_KEY"}
            </span>
          </li>
        </ul>
      ) : null}

      <div className="mt-4 space-y-2 text-sm text-muted">
        <p className="font-medium text-ink">Netlify / .env (server)</p>
        <pre className="overflow-x-auto rounded-lg bg-canvas p-3 text-xs text-ink">
{`CAPTURE_TOKEN=<long-random-secret>
CAPTURE_USER_ID=<your-supabase-auth-uuid>
SUPABASE_SERVICE_ROLE_KEY=<service-role>
GEMINI_API_KEY=<Google-AI-Studio-key>`}
        </pre>
        <p>
          Find <code className="text-ink">CAPTURE_USER_ID</code> in Supabase → Authentication → Users → your user →
          UUID.
        </p>
      </div>

      <div className="mt-4 space-y-2 text-sm text-muted">
        <p className="font-medium text-ink">iOS Shortcut (screenshot OCR)</p>
        <ol className="list-decimal space-y-1 pl-5">
          <li>
            Details → Show in Share Sheet → accept <strong className="font-medium text-ink">Images</strong>{" "}
            (and Text if you also want Copy).
          </li>
          <li>
            <code className="text-ink">Extract Text from</code> → Shortcut Input
          </li>
          <li>
            If <code className="text-ink">Text from Image</code> is empty → Show Alert (&quot;Couldn&apos;t read
            that screenshot&quot;) and Stop Shortcut.
          </li>
          <li>
            Get Contents of URL:{" "}
            <code className="break-all text-ink">{captureUrl}</code>
            <span className="mt-1 block text-xs text-faint">
              Always the live Netlify site — your iPhone cannot reach localhost.
            </span>
          </li>
          <li>Method POST · Headers: Authorization = Bearer YOUR_CAPTURE_TOKEN</li>
          <li>
            Request body JSON · key <code className="text-ink">text</code> ={" "}
            <code className="text-ink">Text from Image</code> (magic variable from Extract Text)
          </li>
          <li>
            Optional while testing: Show Result / Show Notification with the URL response (should include{" "}
            <code className="text-ink">ok: true</code>).
          </li>
        </ol>
        <p className="mt-2">
          After a successful run: open live Studio OS signed in as the same account, pull to refresh or switch
          tabs — look under Today&apos;s Respond strip or Lot → Respond.
        </p>
      </div>
    </section>
  );
}
