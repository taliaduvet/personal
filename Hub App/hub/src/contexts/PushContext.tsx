
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { subscribeToPush } from '../lib/push';

interface PushContextValue {
  isSubscribed: boolean;
  permissionState: NotificationPermission | 'unsupported';
  subscribe: () => Promise<void>;
}

const PushContext = createContext<PushContextValue>({
  isSubscribed: false,
  permissionState: 'default',
  subscribe: async () => {},
});

export function PushProvider({
  children,
  deviceSyncId,
}: {
  children: ReactNode;
  deviceSyncId: string;
}) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permissionState, setPermissionState] = useState<NotificationPermission | 'unsupported'>(
    'default'
  );

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPermissionState('unsupported');
      return;
    }

    // Register service worker
    navigator.serviceWorker.register('/sw.js').catch(console.error);

    // Check existing permission and subscription
    setPermissionState(Notification.permission);
    navigator.serviceWorker.ready.then((reg) =>
      reg.pushManager.getSubscription().then((sub) => setIsSubscribed(!!sub))
    );
  }, []);

  const subscribe = async () => {
    const ok = await subscribeToPush(deviceSyncId);
    if (ok) {
      setIsSubscribed(true);
      setPermissionState('granted');
    }
  };

  return (
    <PushContext.Provider value={{ isSubscribed, permissionState, subscribe }}>
      {children}
    </PushContext.Provider>
  );
}

export const usePush = () => useContext(PushContext);
