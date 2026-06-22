"use client";

import { getDriveAccessToken } from "./drive-auth";
import { useDriveAuth } from "./use-drive-auth";

/** OAuth token for Google Picker — requires dedicated Drive connect. */
export function useDrivePickerToken(): string | null {
  const { token, connected } = useDriveAuth();
  return connected ? (token ?? getDriveAccessToken()) : null;
}
