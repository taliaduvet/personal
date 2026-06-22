"use client";

import { useCallback, useEffect, useState } from "react";
import { useGoogleAccessToken } from "@/lib/google/use-google-access-token";
import {
  connectCalendarDirect,
  disconnectCalendarDirect,
  getCalendarAccessToken,
  isCalendarDirectConnected,
  refreshCalendarDirectSilent,
} from "@/lib/google/calendar-auth";

/** Calendar token: direct GIS connect first, then Supabase provider_token fallback. */
export function useCalendarAccessToken(): {
  token: string | null;
  directConnected: boolean;
  refresh: () => void;
} {
  const supabaseToken = useGoogleAccessToken();
  const [directToken, setDirectToken] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const existing = getCalendarAccessToken();
      if (existing) {
        if (!cancelled) setDirectToken(existing);
        return;
      }
      if (isCalendarDirectConnected()) {
        const refreshed = await refreshCalendarDirectSilent();
        if (!cancelled) setDirectToken(refreshed);
      } else if (!cancelled) {
        setDirectToken(null);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [tick]);

  const token = directToken ?? supabaseToken;

  return {
    token,
    directConnected: Boolean(directToken),
    refresh,
  };
}

export function useCalendarConnectActions() {
  const { refresh } = useCalendarAccessToken();

  const connect = useCallback(async (clientId?: string) => {
    await connectCalendarDirect(clientId);
    refresh();
  }, [refresh]);

  const disconnect = useCallback(() => {
    disconnectCalendarDirect();
    refresh();
  }, [refresh]);

  return { connect, disconnect, refresh };
}
