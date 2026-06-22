"use client";

import { useCallback, useEffect, useState } from "react";
import {
  connectSheetsDirect,
  disconnectSheetsDirect,
  getSheetsAccessToken,
  isSheetsDirectConnected,
  refreshSheetsDirectSilent,
} from "@/lib/google/sheets-auth";

export function useSheetsAccessToken(): {
  token: string | null;
  connected: boolean;
  refresh: () => void;
} {
  const [token, setToken] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const existing = getSheetsAccessToken();
      if (existing) {
        if (!cancelled) setToken(existing);
        return;
      }
      if (isSheetsDirectConnected()) {
        const refreshed = await refreshSheetsDirectSilent();
        if (!cancelled) setToken(refreshed);
      } else if (!cancelled) {
        setToken(null);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [tick]);

  return {
    token,
    connected: Boolean(token),
    refresh,
  };
}

export function useSheetsConnectActions() {
  const { refresh } = useSheetsAccessToken();

  const connect = useCallback(async (clientId?: string) => {
    const t = await connectSheetsDirect(clientId);
    refresh();
    return t;
  }, [refresh]);

  const disconnect = useCallback(() => {
    disconnectSheetsDirect();
    refresh();
  }, [refresh]);

  return { connect, disconnect, refresh };
}
