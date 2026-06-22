"use client";

import { useCallback, useEffect, useState } from "react";
import {
  connectGoogleUnified,
  disconnectGoogleUnified,
  invalidateUnifiedTokenCache,
  isGoogleUnifiedConnected,
} from "./google-unified-auth";
import { subscribeGoogleAuthChange } from "./oauth-callback";
import { UNIFIED_TOKEN_KEY } from "./google-unified-auth";

export function useGoogleUnifiedAuth() {
  const [rev, setRev] = useState(0);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const sync = () => {
      invalidateUnifiedTokenCache();
      setConnected(isGoogleUnifiedConnected());
    };
    sync();
    const bump = () => {
      setRev((v) => v + 1);
      sync();
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === UNIFIED_TOKEN_KEY || e.key === null) invalidateUnifiedTokenCache();
      bump();
    };
    const unsub = subscribeGoogleAuthChange(bump);
    window.addEventListener("storage", onStorage);
    return () => {
      unsub();
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    invalidateUnifiedTokenCache();
    setConnected(isGoogleUnifiedConnected());
  }, [rev]);

  const connect = useCallback(async (clientId?: string) => {
    await connectGoogleUnified(clientId);
    setRev((v) => v + 1);
  }, []);

  const disconnect = useCallback(() => {
    disconnectGoogleUnified();
    setRev((v) => v + 1);
  }, []);

  return { connected, connect, disconnect };
}
