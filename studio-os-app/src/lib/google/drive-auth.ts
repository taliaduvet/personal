import {
  createAuthBus,
  createTokenStore,
  requestGisToken,
  type OAuthPending,
} from "./gis-oauth";
import { getStoredCalendarClientId, saveCalendarClientId } from "./calendar-auth";
import { getUnifiedGoogleToken } from "./google-unified-auth";
import { DRIVE_READONLY_SCOPE } from "./google-scopes";

export { DRIVE_READONLY_SCOPE };

const STORAGE_TOKEN_KEY = "studio-os.gdrive-token.v1";
const OPT_OUT_KEY = "studio-os.gdrive-opt-out.v1";

const store = createTokenStore(STORAGE_TOKEN_KEY);
const bus = createAuthBus();

function drivePending(): OAuthPending {
  const path =
    typeof window !== "undefined"
      ? window.location.pathname + window.location.search
      : "/settings";
  return {
    storageKey: STORAGE_TOKEN_KEY,
    optOutKey: OPT_OUT_KEY,
    scope: DRIVE_READONLY_SCOPE,
    returnUrl: path,
  };
}

export function subscribeDriveAuth(cb: () => void) {
  return bus.subscribe(cb);
}

export function emitDriveAuthChange() {
  bus.emit();
}

export function isDriveOptOut(): boolean {
  if (getUnifiedGoogleToken()) return false;
  if (typeof window === "undefined") return false;
  return localStorage.getItem(OPT_OUT_KEY) === "1";
}

export function getDriveAccessToken(): string | null {
  const unified = getUnifiedGoogleToken();
  if (unified) return unified;
  if (isDriveOptOut()) return null;
  return store.getCached();
}

export function isDriveDirectConnected(): boolean {
  return Boolean(getDriveAccessToken());
}

export function disconnectDriveDirect() {
  store.clear();
  localStorage.setItem(OPT_OUT_KEY, "1");
  bus.emit();
}

export async function connectDriveDirect(clientId?: string): Promise<string> {
  const id = (clientId ?? getStoredCalendarClientId()).trim();
  if (!id) {
    throw new Error("Add a Google Client ID in Settings first.");
  }
  saveCalendarClientId(id);
  localStorage.removeItem(OPT_OUT_KEY);

  try {
    const resp = await requestGisToken(id, DRIVE_READONLY_SCOPE, "consent", drivePending());
    store.write(resp.access_token, resp.expires_in);
    bus.emit();
    return resp.access_token;
  } catch (e) {
    if (e instanceof Error && e.message === "REDIRECTING_TO_GOOGLE") {
      throw e;
    }
    throw e;
  }
}

export async function refreshDriveDirectSilent(): Promise<string | null> {
  if (isDriveOptOut()) return null;
  const id = getStoredCalendarClientId();
  if (!id) return null;
  try {
    const resp = await requestGisToken(id, DRIVE_READONLY_SCOPE, "");
    store.write(resp.access_token, resp.expires_in);
    bus.emit();
    return resp.access_token;
  } catch {
    return null;
  }
}

/** Connect Drive from a click — skips silent refresh so only one popup opens. */
export async function ensureDriveAccessToken(clientId?: string): Promise<string> {
  const existing = getDriveAccessToken();
  if (existing) return existing;
  return connectDriveDirect(clientId);
}

export function writeDriveTokenFromRedirect(token: string, expiresIn: number) {
  localStorage.removeItem(OPT_OUT_KEY);
  store.write(token, expiresIn);
  bus.emit();
}

export { STORAGE_TOKEN_KEY as DRIVE_STORAGE_KEY, OPT_OUT_KEY as DRIVE_OPT_OUT_KEY };
