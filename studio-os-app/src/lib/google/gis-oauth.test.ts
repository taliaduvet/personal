import { describe, expect, it } from "vitest";
import { buildGoogleOAuthUrl } from "./gis-oauth";

describe("buildGoogleOAuthUrl", () => {
  it("requests offline access and full consent so Google issues a refresh token", () => {
    const url = buildGoogleOAuthUrl(
      "client-123",
      "scope-a scope-b",
      "https://example.com/api/google-oauth-callback",
      { challenge: "challenge-abc", state: "state-xyz" }
    );
    const parsed = new URL(url);

    expect(parsed.origin + parsed.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(parsed.searchParams.get("access_type")).toBe("offline");
    expect(parsed.searchParams.get("prompt")).toBe("consent");
    expect(parsed.searchParams.get("response_type")).toBe("code");
    expect(parsed.searchParams.get("client_id")).toBe("client-123");
    expect(parsed.searchParams.get("redirect_uri")).toBe("https://example.com/api/google-oauth-callback");
    expect(parsed.searchParams.get("scope")).toBe("scope-a scope-b");
    expect(parsed.searchParams.get("code_challenge")).toBe("challenge-abc");
    expect(parsed.searchParams.get("code_challenge_method")).toBe("S256");
    expect(parsed.searchParams.get("state")).toBe("state-xyz");
  });
});
