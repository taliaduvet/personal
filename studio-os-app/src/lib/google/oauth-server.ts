/** Server-only: exchange authorization code for tokens (OAuth 2.0 + PKCE). */

export type GoogleTokenResponse = {
  access_token: string;
  expires_in: number;
  token_type?: string;
  scope?: string;
  refresh_token?: string;
};

export async function exchangeGoogleAuthCode(
  code: string,
  codeVerifier: string,
  redirectUri: string
): Promise<GoogleTokenResponse> {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error("Missing NEXT_PUBLIC_GOOGLE_CLIENT_ID");
  }

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
    code_verifier: codeVerifier,
  });

  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (clientSecret) {
    body.set("client_secret", clientSecret);
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const json = (await res.json()) as GoogleTokenResponse & { error?: string; error_description?: string };
  if (!res.ok || json.error) {
    throw new Error(json.error_description || json.error || `Token exchange failed (${res.status})`);
  }
  if (!json.access_token || !json.expires_in) {
    throw new Error("Token exchange returned no access token");
  }
  return json;
}
