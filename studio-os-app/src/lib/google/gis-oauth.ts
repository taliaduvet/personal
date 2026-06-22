import { loadScript } from "./load-script";
import { createPkcePair, setOAuthCookies } from "./oauth-pkce";

export const GOOGLE_TOKEN_CALLBACK_PATH = "/api/google-oauth-callback";
/** Client page that reads token after API redirect forwards the hash. */
export const GOOGLE_TOKEN_FINISH_PATH = "/auth/google-token";
const PENDING_KEY = "studio-os.google-oauth-pending.v1";
const PENDING_BACKUP_KEY = "studio-os.google-oauth-pending-backup.v1";
const PENDING_TTL_MS = 15 * 60 * 1000;

export type OAuthPending = {
  storageKey: string;
  optOutKey?: string;
  scope: string;
  returnUrl: string;
  codeVerifier?: string;
  oauthState?: string;
};

let gsiReady: Promise<void> | null = null;

export function isGsiLoaded(): boolean {
  return typeof window !== "undefined" && Boolean(window.google?.accounts?.oauth2);
}

export function preloadGsi(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("Browser only"));
  if (isGsiLoaded()) return Promise.resolve();
  if (!gsiReady) gsiReady = ensureGsiLoaded();
  return gsiReady;
}

export function ensureGsiLoaded(): Promise<void> {
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

export function savePendingOAuth(pending: OAuthPending) {
  const payload = JSON.stringify({ ...pending, savedAt: Date.now() });
  sessionStorage.setItem(PENDING_KEY, payload);
  // Backup survives rare sessionStorage loss across OAuth redirect hops.
  localStorage.setItem(PENDING_BACKUP_KEY, payload);
}

export function readPendingOAuth(): OAuthPending | null {
  const parse = (raw: string | null): OAuthPending | null => {
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as OAuthPending & { savedAt?: number };
      if (parsed.savedAt && Date.now() - parsed.savedAt > PENDING_TTL_MS) return null;
      const { savedAt: _savedAt, ...pending } = parsed;
      return pending;
    } catch {
      return null;
    }
  };

  return parse(sessionStorage.getItem(PENDING_KEY)) ?? parse(localStorage.getItem(PENDING_BACKUP_KEY));
}

export function clearPendingOAuth() {
  sessionStorage.removeItem(PENDING_KEY);
  localStorage.removeItem(PENDING_BACKUP_KEY);
}

export function redirectUri(): string {
  return `${window.location.origin}${GOOGLE_TOKEN_CALLBACK_PATH}`;
}

/** Build authorization-code OAuth URL (Google requires this — implicit token flow is blocked). */
export function buildGoogleOAuthUrl(
  clientId: string,
  scope: string,
  pkce: { challenge: string; state: string }
): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope,
    prompt: "consent",
    code_challenge: pkce.challenge,
    code_challenge_method: "S256",
    state: pkce.state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Same-tab OAuth via top-level navigation (authorization code + PKCE).
 */
export async function startRedirectOAuth(clientId: string, scope: string, pending: OAuthPending) {
  const { verifier, challenge } = await createPkcePair();
  const state = crypto.randomUUID();
  savePendingOAuth({ ...pending, codeVerifier: verifier, oauthState: state });
  setOAuthCookies(verifier, state);
  window.location.replace(buildGoogleOAuthUrl(clientId, scope, { challenge, state }));
}

export async function requestGisToken(
  clientId: string,
  scope: string,
  prompt: "" | "consent",
  pending?: OAuthPending
): Promise<{ access_token: string; expires_in: number }> {
  if (!isGsiLoaded()) {
    await preloadGsi();
  }
  const oauth2 = window.google?.accounts?.oauth2;
  if (!oauth2) throw new Error("Google sign-in not available");

  // Consent: full-page redirect to Google (authorization code + PKCE).
  if (prompt === "consent" && pending) {
    await startRedirectOAuth(clientId, scope, pending);
    throw new Error("REDIRECTING_TO_GOOGLE");
  }

  return new Promise((resolve, reject) => {
    const client = oauth2.initTokenClient({
      client_id: clientId,
      scope,
      callback: (resp) => {
        if (resp.error) {
          reject(new Error(resp.error_description || resp.error));
          return;
        }
        if (!resp.access_token || !resp.expires_in) {
          reject(new Error("No access token returned"));
          return;
        }
        resolve({ access_token: resp.access_token, expires_in: resp.expires_in });
      },
    });
    client.requestAccessToken({ prompt });
  });
}

export type TokenStore = {
  read: () => string | null;
  /** Always reads localStorage — use after OAuth in another tab. */
  readFresh: () => string | null;
  write: (token: string, expiresInSec: number) => void;
  clear: () => void;
  getCached: () => string | null;
  invalidate: () => void;
};

export function createTokenStore(storageKey: string): TokenStore {
  let cachedToken: string | null = null;
  let tokenExpiry = 0;

  function readStored(): string | null {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { token: string; expiry: number };
      if (parsed.expiry > Date.now()) return parsed.token;
      localStorage.removeItem(storageKey);
      return null;
    } catch {
      return null;
    }
  }

  function readStoredWithExpiry(): { token: string; expiry: number } | null {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { token: string; expiry: number };
      if (parsed.expiry > Date.now()) return parsed;
      localStorage.removeItem(storageKey);
      return null;
    } catch {
      return null;
    }
  }

  if (typeof window !== "undefined") {
    cachedToken = readStored();
  }

  return {
    getCached() {
      if (cachedToken && tokenExpiry > Date.now()) return cachedToken;
      if (typeof window === "undefined") return null;
      const stored = readStoredWithExpiry();
      if (stored) {
        cachedToken = stored.token;
        tokenExpiry = stored.expiry;
        return stored.token;
      }
      return null;
    },
    readFresh() {
      return readStored();
    },
    read() {
      return this.getCached();
    },
    write(token: string, expiresInSec: number) {
      cachedToken = token;
      tokenExpiry = Date.now() + (expiresInSec - 60) * 1000;
      localStorage.setItem(
        storageKey,
        JSON.stringify({ token, expiry: tokenExpiry })
      );
    },
    clear() {
      cachedToken = null;
      tokenExpiry = 0;
      localStorage.removeItem(storageKey);
    },
    invalidate() {
      cachedToken = null;
      tokenExpiry = 0;
    },
  };
}

export type AuthBus = {
  subscribe: (cb: () => void) => () => void;
  emit: () => void;
};

export function createAuthBus(): AuthBus {
  const listeners = new Set<() => void>();
  return {
    subscribe(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    emit() {
      listeners.forEach((cb) => cb());
    },
  };
}
