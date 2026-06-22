"use client";

import { useCallback, useEffect, useState } from "react";
import { useGoogleAccessToken } from "@/lib/google/use-google-access-token";
import { subscribeGoogleAuthChange } from "@/lib/google/oauth-callback";
import {
  connectCalendarDirect,
  disconnectCalendarDirect,
  getCalendarAccessToken,
  isCalendarOptOut,
  refreshCalendarDirectSilent,
} from "@/lib/google/calendar-auth";
import { isGoogleUnifiedConnected } from "@/lib/google/google-unified-auth";

/** Calendar token + connect/disconnect — single hook so UI stays in sync. */
export function useCalendarAccessToken(): {
  token: string | null;
  directConnected: boolean;
  optedOut: boolean;
  connect: (clientId?: string) => Promise<void>;
  disconnect: () => void;
  refresh: () => void;
} {
  const supabaseToken = useGoogleAccessToken();
  const [rev, setRev] = useState(0);

  useEffect(() => subscribeGoogleAuthChange(() => setRev((v) => v + 1)), []);

  const refresh = useCallback(() => setRev((v) => v + 1), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (isCalendarOptOut()) return;
      const existing = getCalendarAccessToken();
      if (existing || cancelled) return;
      await refreshCalendarDirectSilent();
      if (!cancelled) setRev((v) => v + 1);
    })();
    return () => {
      cancelled = true;
    };
  }, [rev]);

  void rev;

  const optedOut = isCalendarOptOut();
  const directToken = getCalendarAccessToken();
  const token = optedOut ? directToken : (directToken ?? supabaseToken);
  const directConnected = Boolean(directToken) && !optedOut;
  const unifiedConnected = isGoogleUnifiedConnected();

  const connect = useCallback(async (clientId?: string) => {
    await connectCalendarDirect(clientId);
    setRev((v) => v + 1);
  }, []);

  const disconnect = useCallback(() => {
    disconnectCalendarDirect();
    setRev((v) => v + 1);
  }, []);

  return { token, directConnected: directConnected || unifiedConnected, optedOut, connect, disconnect, refresh };
}

/** @deprecated Use useCalendarAccessToken — connect/disconnect are on the same hook now. */
export function useCalendarConnectActions() {
  const { connect, disconnect, refresh } = useCalendarAccessToken();
  return { connect, disconnect, refresh };
}
