"use client";

import { getSupabase, getCloudUserId } from "@/lib/supabase/session";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string;

/** Stable per-device id so each physical device keeps its own subscription row. */
const DEVICE_ID_KEY = "studio-os.device-sync-id";

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * A durable id for this browser/device. `push_subscriptions.device_sync_id` is
 * UNIQUE, so keying on the user id would collapse phone + laptop into one row —
 * only one device could receive a push. A per-device uuid keeps them separate.
 */
function getDeviceSyncId(): string {
  if (typeof localStorage === "undefined") return "unknown-device";
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `dev-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

/** Persist a browser PushSubscription to Supabase. Returns false (with a log) on any failure. */
async function writeSubscription(subscription: PushSubscription): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
  // RLS is `auth.uid() = user_id` — the write must be authenticated AND carry user_id.
  const userId = await getCloudUserId();
  if (!userId) {
    console.warn("[push] not signed in — cannot save subscription (RLS requires a user)");
    return false;
  }
  const sub = subscription.toJSON();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      device_sync_id: getDeviceSyncId(),
      user_id: userId,
      endpoint: sub.endpoint,
      p256dh: sub.keys?.p256dh,
      auth: sub.keys?.auth,
    },
    { onConflict: "device_sync_id" },
  );
  if (error) {
    console.error("[push] failed to persist subscription:", error.message);
    return false;
  }
  return true;
}

/**
 * Prompt for notification permission (if not already decided) and persist a
 * fresh subscription. Use for the explicit "Turn on notifications" action.
 */
export async function subscribeToPush(): Promise<boolean> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;
  return ensurePushSubscribed({ resubscribe: true });
}

/**
 * Self-heal path: when permission is already granted, make sure a live browser
 * PushSubscription exists and its row is in Supabase. Safe to call on every app
 * load — no-ops unless permission is granted. This is what recovers a device
 * that granted permission while the old (broken) save silently failed.
 */
export async function ensurePushSubscribed(
  opts: { resubscribe?: boolean } = {},
): Promise<boolean> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return false;
  const reg = await navigator.serviceWorker.ready;
  let subscription = await reg.pushManager.getSubscription();
  if (subscription && opts.resubscribe) {
    await subscription.unsubscribe();
    subscription = null;
  }
  if (!subscription) {
    subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }
  return writeSubscription(subscription);
}
