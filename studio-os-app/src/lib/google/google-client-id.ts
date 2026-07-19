/** Shared OAuth client id storage — kept free of other Google modules to avoid import cycles. */

export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

const STORAGE_CLIENT_KEY = "studio-os.gcal-client-id";

export function getStoredCalendarClientId(): string {
  if (typeof window === "undefined") return GOOGLE_CLIENT_ID;
  return localStorage.getItem(STORAGE_CLIENT_KEY) || GOOGLE_CLIENT_ID;
}

export function saveCalendarClientId(id: string) {
  const trimmed = id.trim();
  if (trimmed) localStorage.setItem(STORAGE_CLIENT_KEY, trimmed);
  else localStorage.removeItem(STORAGE_CLIENT_KEY);
}
