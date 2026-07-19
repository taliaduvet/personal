import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { subscribeToPush } from '../lib/push';

interface PushContextValue {
  isSubscribed: boolean;
  subscribe: () => Promise<void>;
}

const PushContext = createContext<PushContextValue>({ isSubscribed: false, subscribe: async () => {} });

export function PushProvider({ children, deviceSyncId }: { children: ReactNode; deviceSyncId: string }) {
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(console.error);
    }
    // Check existing subscription
    navigator.serviceWorker.ready.then((reg) =>
      reg.pushManager.getSubscription().then((sub) => setIsSubscribed(!!sub))
    );
  }, []);

  const subscribe = async () => {
    const ok = await subscribeToPush(deviceSyncId);
    setIsSubscribed(ok);
  };

  return <PushContext.Provider value={{ isSubscribed, subscribe }}>{children}</PushContext.Provider>;
}

export const usePush = () => useContext(PushContext);
