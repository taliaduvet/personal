"use client";

import { useCallback, useEffect, useState } from "react";
import {
  connectAndFetchGoogleContacts,
  connectContactsDirect,
  disconnectContactsDirect,
  fetchGoogleContacts,
  getContactsAccessToken,
  isContactsOptOut,
  refreshContactsDirectSilent,
  subscribeContactsAuth,
} from "./contacts-auth";
import type { Contact } from "@/lib/sheet/app-data";

export function useGoogleContactsAuth() {
  const [rev, setRev] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => subscribeContactsAuth(() => setRev((v) => v + 1)), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (isContactsOptOut()) return;
      const existing = getContactsAccessToken();
      if (existing || cancelled) return;
      await refreshContactsDirectSilent();
      if (!cancelled) setRev((v) => v + 1);
    })();
    return () => {
      cancelled = true;
    };
  }, [rev]);

  void rev;

  const connected = Boolean(getContactsAccessToken());
  const optedOut = isContactsOptOut();

  const connect = useCallback(async (clientId?: string) => {
    setSyncError(null);
    setSyncing(true);
    try {
      await connectContactsDirect(clientId);
      setRev((v) => v + 1);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not connect Google Contacts";
      setSyncError(message);
      throw e;
    } finally {
      setSyncing(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    disconnectContactsDirect();
    setRev((v) => v + 1);
  }, []);

  const syncContacts = useCallback(async (clientId?: string): Promise<Contact[]> => {
    setSyncError(null);
    setSyncing(true);
    try {
      const list = await connectAndFetchGoogleContacts(clientId);
      setRev((v) => v + 1);
      return list;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not load contacts";
      setSyncError(message);
      throw e;
    } finally {
      setSyncing(false);
    }
  }, []);

  const refreshContacts = useCallback(async (): Promise<Contact[]> => {
    setSyncError(null);
    setSyncing(true);
    try {
      let token = getContactsAccessToken();
      if (!token) token = await refreshContactsDirectSilent();
      if (!token) throw new Error("Connect Google Contacts first.");
      const list = await fetchGoogleContacts(token);
      setRev((v) => v + 1);
      return list;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not refresh contacts";
      setSyncError(message);
      throw e;
    } finally {
      setSyncing(false);
    }
  }, []);

  return {
    connected,
    optedOut,
    syncing,
    syncError,
    connect,
    disconnect,
    syncContacts,
    refreshContacts,
  };
}
