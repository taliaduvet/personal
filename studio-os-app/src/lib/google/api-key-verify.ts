import { GOOGLE_API_KEY, GOOGLE_APP_ID, googlePickerSetupHint } from "./load-script";

export type ApiKeyVerifyResult = {
  ok: boolean;
  message: string;
  referrersToAdd: string[];
};

/** Referrers Google Picker commonly needs for local dev + the picker iframe. */
export function recommendedPickerReferrers(
  origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"
): string[] {
  const host = origin.replace(/^https?:\/\//, "");
  return [...new Set([
    `${origin}/*`,
    `http://${host}/*`,
    "http://localhost:3000/*",
    "http://127.0.0.1:3000/*",
    "https://docs.google.com/*",
  ])];
}

/**
 * Env-only picker readiness check.
 * We intentionally do NOT call Google REST APIs here — restricted API keys
 * often block discovery.googleapis.com even when the Picker works fine.
 */
export async function verifyGoogleApiKeyForPicker(): Promise<ApiKeyVerifyResult> {
  const referrersToAdd = recommendedPickerReferrers();
  const hint = googlePickerSetupHint();
  if (hint) {
    return { ok: false, message: hint, referrersToAdd };
  }

  return {
    ok: true,
    message:
      "Picker env looks good. If the picker still errors, confirm website referrers below (changes can take a few minutes).",
    referrersToAdd,
  };
}

export function pickerEnvSummary(): string {
  return `API key …${GOOGLE_API_KEY.slice(-6)} · app ${GOOGLE_APP_ID}`;
}
