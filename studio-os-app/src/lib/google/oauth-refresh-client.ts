/**
 * Mint a fresh access token from the httpOnly refresh cookie (see
 * /api/google-token-refresh) instead of Google's flaky browser-session-based
 * silent reauth. Returns null on any failure — callers fall back accordingly.
 */
export async function refreshViaCookie(): Promise<{ access_token: string; expires_in: number } | null> {
  try {
    const res = await fetch("/api/google-token-refresh", { method: "POST" });
    if (!res.ok) return null;
    const json = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!json.access_token || !json.expires_in) return null;
    return { access_token: json.access_token, expires_in: json.expires_in };
  } catch {
    return null;
  }
}
