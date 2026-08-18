"use client";

import { useEffect } from "react";

/**
 * Last resort — the root layout itself failed, so the app shell, theme script
 * and font variables are all unavailable. This deliberately uses inline styles
 * rather than Tailwind tokens: if the stylesheet is what broke, token-based
 * markup would render invisible and we would be back to a white screen.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Studio OS fatal error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          background: "#faf9f7",
          color: "#1c1b1a",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        <div style={{ maxWidth: "26rem" }}>
          <h1 style={{ fontSize: "1.125rem", fontWeight: 600, margin: 0 }}>
            Studio OS couldn&apos;t start.
          </h1>

          <p style={{ fontSize: "0.875rem", lineHeight: 1.6, color: "#6b6763" }}>
            The app failed to load before it could render anything. This is a display
            failure, not a data failure — everything you&apos;ve captured is still in
            local storage and in your cloud vault.
          </p>

          <p style={{ fontSize: "0.875rem", lineHeight: 1.6, color: "#6b6763" }}>
            If reloading doesn&apos;t help, don&apos;t clear your browser data — that
            would remove the local copy. Reach for a different browser or device first.
          </p>

          {error.digest && (
            <p style={{ fontSize: "0.6875rem", fontFamily: "ui-monospace, monospace", color: "#6b6763" }}>
              Ref: {error.digest}
            </p>
          )}

          <button
            onClick={reset}
            style={{
              marginTop: "0.5rem",
              padding: "0.5rem 0.875rem",
              fontSize: "0.875rem",
              color: "#1c1b1a",
              background: "transparent",
              border: "1px solid #d9d4ce",
              borderRadius: "0.375rem",
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
