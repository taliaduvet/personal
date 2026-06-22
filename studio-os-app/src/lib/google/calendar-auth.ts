import { loadScript } from "./load-script";
import { CALENDAR_READONLY_SCOPE } from "./calendar-client";

const STORAGE_TOKEN_KEY = "studio-os.gcal-token.v1";
const STORAGE_CLIENT_KEY = "studio-os.gcal-client-id";

let cachedToken: string | null = null;
let tokenExpiry = 0;

export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

function readStoredToken(): string | null {
  try {
    const raw = localStorage.getItem(STORAGE_TOKEN_KEY);
    if (!raw) return null;
    const { token, expiry } = JSON.parse(raw) as { token: string; expiry: number };
    if (expiry > Date.now()) return token;
    localStorage.removeItem(STORAGE_TOKEN_KEY);
    return null;
  } catch {
    return null;
  }
}

function writeToken(token: string, expiresInSec: number) {
  cachedToken = token;
  tokenExpiry = Date.now() + (expiresInSec - 60) * 1000;
  localStorage.setItem(
    STORAGE_TOKEN_KEY,
    JSON.stringify({ token, expiry: tokenExpiry })
  );
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

export function getCalendarAccessToken(): string | null {
  if (cachedToken && tokenExpiry > Date.now()) return cachedToken;
  if (typeof window === "undefined") return null;
  const stored = readStoredToken();
  if (stored) {
    cachedToken = stored;
    return stored;
  }
  return null;
}

export function isCalendarDirectConnected(): boolean {
  return Boolean(getCalendarAccessToken());
}

export function disconnectCalendarDirect() {
  cachedToken = null;
  tokenExpiry = 0;
  localStorage.removeItem(STORAGE_TOKEN_KEY);
}

function ensureGsiLoaded(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("Browser only"));
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  return loadScript("https://accounts.google.com/gsi/client", "google-gsi-js").then(
    () =>
      new Promise((resolve, reject) => {
        let tries = 0;
        const poll = setInterval(() => {
          if (window.google?.accounts?.oauth2) {
            clearInterval(poll);
            resolve();
          }
          if (++tries > 40) {
            clearInterval(poll);
            reject(new Error("Google sign-in failed to load"));
          }
        }, 250);
      })
  );
}

async function requestToken(clientId: string, prompt: "" | "consent"): Promise<string> {
  await ensureGsiLoaded();
  const oauth2 = window.google?.accounts?.oauth2;
  if (!oauth2) throw new Error("Google sign-in not available");

  return new Promise((resolve, reject) => {
    const client = oauth2.initTokenClient({
      client_id: clientId,
      scope: CALENDAR_READONLY_SCOPE,
      callback: (resp) => {
        if (resp.error) {
          reject(new Error(resp.error_description || resp.error));
          return;
        }
        if (!resp.access_token || !resp.expires_in) {
          reject(new Error("No access token returned"));
          return;
        }
        writeToken(resp.access_token, resp.expires_in);
        resolve(resp.access_token);
      },
    });
    client.requestAccessToken({ prompt });
  });
}

/** Connect Google Calendar via GIS (works without Supabase Google provider). */
export async function connectCalendarDirect(clientId?: string): Promise<string> {
  const id = (clientId ?? getStoredCalendarClientId()).trim();
  if (!id) {
    throw new Error("Add a Google Client ID in Settings first.");
  }
  saveCalendarClientId(id);
  return requestToken(id, "consent");
}

export async function refreshCalendarDirectSilent(): Promise<string | null> {
  const id = getStoredCalendarClientId();
  if (!id) return null;
  try {
    return await requestToken(id, "");
  } catch {
    return null;
  }
}

if (typeof window !== "undefined") {
  cachedToken = readStoredToken();
}
