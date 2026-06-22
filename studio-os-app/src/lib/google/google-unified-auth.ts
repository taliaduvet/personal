import {
  createTokenStore,
  requestGisToken,
  type OAuthPending,
} from "./gis-oauth";
import { getStoredCalendarClientId, saveCalendarClientId } from "./calendar-auth";
import { GOOGLE_UNIFIED_SCOPES } from "./google-scopes";

export { GOOGLE_UNIFIED_SCOPES };

export const UNIFIED_TOKEN_KEY = "studio-os.google-unified-token.v1";
export const UNIFIED_OPT_OUT_KEY = "studio-os.google-unified-opt-out.v1";
export const UNIFIED_CONNECTED_AT_KEY = "studio-os.google-unified-connected-at.v1";

const unifiedStore = createTokenStore(UNIFIED_TOKEN_KEY);

export function isGoogleUnifiedOptOut(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(UNIFIED_OPT_OUT_KEY) === "1";
}

export function getUnifiedGoogleToken(): string | null {
  if (isGoogleUnifiedOptOut()) return null;
  return unifiedStore.readFresh();
}

export function invalidateUnifiedTokenCache() {
  unifiedStore.invalidate();
}

export function isGoogleUnifiedConnected(): boolean {
  return Boolean(getUnifiedGoogleToken());
}

export function getGoogleConnectedAt(): string | null {
  try {
    return localStorage.getItem(UNIFIED_CONNECTED_AT_KEY);
  } catch {
    return null;
  }
}

export function disconnectGoogleUnified() {
  unifiedStore.clear();
  localStorage.removeItem(UNIFIED_CONNECTED_AT_KEY);
  localStorage.setItem(UNIFIED_OPT_OUT_KEY, "1");
  localStorage.setItem("studio-os.gcal-opt-out.v1", "1");
  localStorage.setItem("studio-os.gdrive-opt-out.v1", "1");
  localStorage.setItem("studio-os.gcontacts-opt-out.v1", "1");
  window.dispatchEvent(new Event("studio-os.google-auth-changed"));
}

function unifiedPending(): OAuthPending {
  const path =
    typeof window !== "undefined"
      ? window.location.pathname + window.location.search
      : "/settings";
  return {
    storageKey: UNIFIED_TOKEN_KEY,
    optOutKey: UNIFIED_OPT_OUT_KEY,
    scope: GOOGLE_UNIFIED_SCOPES,
    returnUrl: path,
  };
}

/** Connect all Google services via one redirect (reliable — no popup). */
export async function connectGoogleUnified(clientId?: string): Promise<string> {
  const id = (clientId ?? getStoredCalendarClientId()).trim();
  if (!id) throw new Error("Add a Google Client ID in Settings first.");
  saveCalendarClientId(id);
  localStorage.removeItem(UNIFIED_OPT_OUT_KEY);
  localStorage.removeItem("studio-os.gcal-opt-out.v1");
  localStorage.removeItem("studio-os.gdrive-opt-out.v1");
  localStorage.removeItem("studio-os.gcontacts-opt-out.v1");

  const resp = await requestGisToken(id, GOOGLE_UNIFIED_SCOPES, "consent", unifiedPending());
  unifiedStore.write(resp.access_token, resp.expires_in);
  localStorage.setItem(UNIFIED_CONNECTED_AT_KEY, new Date().toISOString());
  window.dispatchEvent(new Event("studio-os.google-auth-changed"));
  return resp.access_token;
}

export function writeUnifiedTokenFromRedirect(token: string, expiresIn: number) {
  localStorage.removeItem(UNIFIED_OPT_OUT_KEY);
  localStorage.removeItem("studio-os.gcal-opt-out.v1");
  localStorage.removeItem("studio-os.gdrive-opt-out.v1");
  localStorage.removeItem("studio-os.gcontacts-opt-out.v1");
  unifiedStore.write(token, expiresIn);
  localStorage.setItem(UNIFIED_CONNECTED_AT_KEY, new Date().toISOString());
  window.dispatchEvent(new Event("studio-os.google-auth-changed"));
}

export function appendReturnQuery(baseUrl: string, key: string, value: string): string {
  const url = new URL(baseUrl, typeof window !== "undefined" ? window.location.origin : "http://localhost");
  url.searchParams.set(key, value);
  return url.pathname + url.search;
}
