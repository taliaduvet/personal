"use client";

import { useCallback, useEffect, useState } from "react";
import {
  disconnectDriveDirect,
  getDriveAccessToken,
  isDriveDirectConnected,
} from "./drive-auth";
import { connectGoogleUnified, isGoogleUnifiedConnected } from "./google-unified-auth";
import { subscribeGoogleAuthChange } from "./oauth-callback";

export function useDriveAuth() {
  const [rev, setRev] = useState(0);

  useEffect(() => subscribeGoogleAuthChange(() => setRev((v) => v + 1)), []);

  void rev;

  const connected = isGoogleUnifiedConnected() || isDriveDirectConnected();

  const connect = useCallback(async (clientId?: string) => {
    await connectGoogleUnified(clientId);
    setRev((v) => v + 1);
  }, []);

  const disconnect = useCallback(() => {
    disconnectDriveDirect();
    setRev((v) => v + 1);
  }, []);

  const ensureToken = useCallback(async (clientId?: string) => {
    const existing = getDriveAccessToken();
    if (existing) return existing;
    await connectGoogleUnified(clientId);
    const token = getDriveAccessToken();
    if (!token) throw new Error("REDIRECTING_TO_GOOGLE");
    setRev((v) => v + 1);
    return token;
  }, []);

  return {
    token: getDriveAccessToken(),
    connected,
    connect,
    disconnect,
    ensureToken,
  };
}
