import { CALENDAR_WRITE_SCOPE } from "@/lib/calendar/calendar-write";
import {
  createAuthBus,
  createTokenStore,
  requestGisToken,
  type OAuthPending,
} from "./gis-oauth";
import { getUnifiedGoogleToken } from "./google-unified-auth";
import { GOOGLE_UNIFIED_SCOPES } from "./google-scopes";
import { refreshViaCookie } from "./oauth-refresh-client";

const STORAGE_TOKEN_KEY = "studio-os.gcal-token.v1";
const STORAGE_CLIENT_KEY = "studio-os.gcal-client-id";
const OPT_OUT_KEY = "studio-os.gcal-opt-out.v1";

const store = createTokenStore(STORAGE_TOKEN_KEY);
const bus = createAuthBus();

export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

function calendarPending(): OAuthPending {
  const path =
    typeof window !== "undefined"
      ? window.location.pathname + window.location.search
      : "/settings";
  return {
    storageKey: STORAGE_TOKEN_KEY,
    optOutKey: OPT_OUT_KEY,
    // Requesting the full unified bundle (not just calendar) here means the
    // resulting refresh token — shared via one cookie across all direct-connect
    // flows — actually covers whichever service asks to silently refresh next.
    scope: GOOGLE_UNIFIED_SCOPES,
    returnUrl: path,
  };
}

export function subscribeCalendarAuth(cb: () => void) {
  return bus.subscribe(cb);
}

export function getStoredCalendarClientId(): string {
  if (typeof window === "undefined") return GOOGLE_CLIENT_ID;
  return localStorage.getItem(STORAGE_CLIENT_KEY) || GOOGLE_CLIENT_ID;
}

export function saveCalendarClientId(id: string) {
  const trimmed = id.trim();
  if (trimmed) localStorage.setItem(STORAGE_CLIENT_KEY, trimmed);
  else localStorage.removeItem(STORAGE_CLIENT_KEY);
}

export function isCalendarOptOut(): boolean {
  if (getUnifiedGoogleToken()) return false;
  if (typeof window === "undefined") return false;
  return localStorage.getItem(OPT_OUT_KEY) === "1";
}

export function getCalendarAccessToken(): string | null {
  const unified = getUnifiedGoogleToken();
  if (unified) return unified;
  return store.getCached();
}

export function isCalendarDirectConnected(): boolean {
  return Boolean(getCalendarAccessToken()) && !isCalendarOptOut();
}

export function disconnectCalendarDirect() {
  store.clear();
  localStorage.setItem(OPT_OUT_KEY, "1");
  bus.emit();
  // Fire-and-forget: kill the shared refresh cookie too, not just the local
  // access token, so "Disconnect" actually stops silent re-access.
  void fetch("/api/google-token-refresh", { method: "DELETE" }).catch(() => {});
}

export async function connectCalendarDirect(clientId?: string): Promise<string> {
  const id = (clientId ?? getStoredCalendarClientId()).trim();
  if (!id) {
    throw new Error("Add a Google Client ID in Settings first.");
  }
  saveCalendarClientId(id);
  localStorage.removeItem(OPT_OUT_KEY);
  const resp = await requestGisToken(
    id,
    GOOGLE_UNIFIED_SCOPES,
    "consent",
    calendarPending()
  );
  store.write(resp.access_token, resp.expires_in);
  bus.emit();
  return resp.access_token;
}

export async function refreshCalendarDirectSilent(): Promise<string | null> {
  if (isCalendarOptOut()) return null;
  const viaCookie = await refreshViaCookie();
  if (viaCookie) {
    store.write(viaCookie.access_token, viaCookie.expires_in);
    bus.emit();
    return viaCookie.access_token;
  }
  const id = getStoredCalendarClientId();
  if (!id) return null;
  try {
    const resp = await requestGisToken(id, CALENDAR_WRITE_SCOPE, "");
    store.write(resp.access_token, resp.expires_in);
    bus.emit();
    return resp.access_token;
  } catch {
    return null;
  }
}
