import type { OAuthPending } from "./gis-oauth";
import { writeDriveTokenFromRedirect } from "./drive-auth";
import {
  writeUnifiedTokenFromRedirect,
  UNIFIED_TOKEN_KEY,
} from "./google-unified-auth";
import { subscribeCalendarAuth } from "./calendar-auth";
import { subscribeContactsAuth } from "./contacts-auth";
import { subscribeDriveAuth } from "./drive-auth";

export const OAUTH_COMPLETE_CHANNEL = "studio-os.google-oauth-complete.v1";
export const OAUTH_COMPLETE_PING_KEY = "studio-os.google-oauth-done.v1";

/** Notify other tabs (Settings) that sign-in finished in the OAuth tab. */
export function notifyOAuthComplete() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(OAUTH_COMPLETE_PING_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
  if (typeof BroadcastChannel !== "undefined") {
    try {
      new BroadcastChannel(OAUTH_COMPLETE_CHANNEL).postMessage({ ok: true });
    } catch {
      /* ignore */
    }
  }
  try {
    window.opener?.postMessage(
      { type: "studio-os:google-oauth-complete" },
      window.location.origin
    );
  } catch {
    /* ignore */
  }
}

export function subscribeOAuthComplete(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  const onStorage = (e: StorageEvent) => {
    if (e.key === OAUTH_COMPLETE_PING_KEY || e.key === UNIFIED_TOKEN_KEY) cb();
  };
  const onMessage = (e: MessageEvent) => {
    if (e.origin !== window.location.origin) return;
    if (e.data?.type === "studio-os:google-oauth-complete") cb();
  };

  let channel: BroadcastChannel | null = null;
  if (typeof BroadcastChannel !== "undefined") {
    channel = new BroadcastChannel(OAUTH_COMPLETE_CHANNEL);
    channel.onmessage = () => cb();
  }

  window.addEventListener("storage", onStorage);
  window.addEventListener("message", onMessage);

  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("message", onMessage);
    channel?.close();
  };
}

/** Persist OAuth token from redirect callback into the correct store(s). */
export function applyOAuthToken(
  pending: OAuthPending,
  accessToken: string,
  expiresIn: number
): void {
  if (pending.optOutKey) {
    localStorage.removeItem(pending.optOutKey);
  }

  const payload = JSON.stringify({
    token: accessToken,
    expiry: Date.now() + (expiresIn - 60) * 1000,
  });

  if (pending.storageKey === UNIFIED_TOKEN_KEY) {
    writeUnifiedTokenFromRedirect(accessToken, expiresIn);
    notifyOAuthComplete();
    return;
  }

  if (pending.storageKey === "studio-os.gdrive-token.v1") {
    writeDriveTokenFromRedirect(accessToken, expiresIn);
    return;
  }

  localStorage.setItem(pending.storageKey, payload);

  if (pending.storageKey === "studio-os.gcal-token.v1") {
    window.dispatchEvent(new Event("studio-os.google-auth-changed"));
  }
  if (pending.storageKey === "studio-os.gcontacts-token.v1") {
    window.dispatchEvent(new Event("studio-os.google-auth-changed"));
  }
}

export function subscribeGoogleAuthChange(cb: () => void): () => void {
  const handler = () => cb();
  window.addEventListener("studio-os.google-auth-changed", handler);
  const unsubs = [
    subscribeDriveAuth(cb),
    subscribeCalendarAuth(cb),
    subscribeContactsAuth(cb),
  ];
  return () => {
    window.removeEventListener("studio-os.google-auth-changed", handler);
    unsubs.forEach((u) => u());
  };
}

export function parseOAuthResponseFromUrl(): {
  access_token: string;
  expires_in: number;
} | null {
  if (typeof window === "undefined") return null;

  if (window.location.hash) {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const access_token = hash.get("access_token");
    const expires_in = parseInt(hash.get("expires_in") ?? "", 10);
    if (access_token && expires_in) return { access_token, expires_in };
  }

  const query = new URLSearchParams(window.location.search);
  const access_token = query.get("access_token");
  const expires_in = parseInt(query.get("expires_in") ?? "", 10);
  if (access_token && expires_in) return { access_token, expires_in };

  return null;
}

export function stripOAuthParamsFromUrl() {
  if (typeof window === "undefined") return;
  const clean = window.location.pathname;
  window.history.replaceState(null, "", clean);
}
