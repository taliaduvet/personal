function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function createPkcePair(): Promise<{ verifier: string; challenge: string }> {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const verifier = base64UrlEncode(bytes);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  const challenge = base64UrlEncode(new Uint8Array(digest));
  return { verifier, challenge };
}

export const OAUTH_VERIFIER_COOKIE = "studio-os.oauth-verifier";
export const OAUTH_STATE_COOKIE = "studio-os.oauth-state";

export function setOAuthCookies(verifier: string, state: string) {
  const maxAge = "max-age=600";
  const sameSite = "SameSite=Lax";
  document.cookie = `${OAUTH_VERIFIER_COOKIE}=${encodeURIComponent(verifier)}; path=/; ${maxAge}; ${sameSite}`;
  document.cookie = `${OAUTH_STATE_COOKIE}=${state}; path=/; ${maxAge}; ${sameSite}`;
}
