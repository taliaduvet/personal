import { afterEach, describe, expect, it, vi } from "vitest";
import { refreshViaCookie } from "./oauth-refresh-client";

function stubFetch(impl: (...args: Parameters<typeof fetch>) => Promise<Response>) {
  vi.stubGlobal("fetch", vi.fn(impl));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("refreshViaCookie", () => {
  it("returns the token on a successful refresh", async () => {
    stubFetch(async () =>
      new Response(JSON.stringify({ access_token: "fresh-token", expires_in: 3600 }), { status: 200 })
    );
    await expect(refreshViaCookie()).resolves.toEqual({ access_token: "fresh-token", expires_in: 3600 });
  });

  it("returns null when the response isn't ok (e.g. no refresh cookie)", async () => {
    stubFetch(async () => new Response(JSON.stringify({ error: "no_refresh_session" }), { status: 401 }));
    await expect(refreshViaCookie()).resolves.toBeNull();
  });

  it("returns null when the response body is missing expected fields", async () => {
    stubFetch(async () => new Response(JSON.stringify({}), { status: 200 }));
    await expect(refreshViaCookie()).resolves.toBeNull();
  });

  it("returns null on a network error instead of throwing", async () => {
    stubFetch(async () => {
      throw new Error("network down");
    });
    await expect(refreshViaCookie()).resolves.toBeNull();
  });
});
