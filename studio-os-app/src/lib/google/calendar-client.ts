import type { RawCalendarEvent } from "../calendar/types";

const CAL_API = "https://www.googleapis.com/calendar/v3";
const CACHE_KEY = "studio-os.gcal-events.v1";
const CACHE_TTL_MS = 5 * 60 * 1000;

type CacheStore = Record<string, { ts: number; data: RawCalendarEvent[] }>;

function readCache(key: string): RawCalendarEvent[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const store = JSON.parse(raw) as CacheStore;
    const entry = store[key];
    if (!entry || Date.now() - entry.ts > CACHE_TTL_MS) return null;
    return entry.data;
  } catch {
    return null;
  }
}

function writeCache(key: string, data: RawCalendarEvent[]) {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const store: CacheStore = raw ? JSON.parse(raw) : {};
    store[key] = { ts: Date.now(), data };
    localStorage.setItem(CACHE_KEY, JSON.stringify(store));
  } catch {
    /* ignore */
  }
}

async function getCalendarIds(accessToken: string): Promise<string[]> {
  const resp = await fetch(`${CAL_API}/users/me/calendarList?minAccessRole=reader`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!resp.ok) return ["primary"];
  const data = (await resp.json()) as {
    items?: { id: string; selected?: boolean; deleted?: boolean }[];
  };
  const ids = (data.items ?? [])
    .filter((c) => c.selected !== false && !c.deleted)
    .map((c) => c.id);
  return ids.length ? ids : ["primary"];
}

function normalizeEvent(raw: {
  id?: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  transparency?: string;
  status?: string;
}): RawCalendarEvent | null {
  if (!raw.id) return null;
  return {
    id: raw.id,
    summary: raw.summary ?? "(No title)",
    start: raw.start ?? {},
    end: raw.end,
    transparency: raw.transparency ?? null,
    status: raw.status ?? null,
  };
}

/**
 * Fetch timed + all-day events for a local date range [startDateKey, endDateKey] inclusive.
 */
export async function fetchCalendarEvents(
  accessToken: string,
  startDateKey: string,
  endDateKey: string
): Promise<RawCalendarEvent[]> {
  const cacheKey = `${startDateKey}_${endDateKey}`;
  const cached = typeof window !== "undefined" ? readCache(cacheKey) : null;
  if (cached) return cached;

  const calIds = await getCalendarIds(accessToken);
  const [sy, sm, sd] = startDateKey.split("-").map(Number);
  const [ey, em, ed] = endDateKey.split("-").map(Number);
  const timeMin = new Date(sy, sm - 1, sd, 0, 0, 0, 0).toISOString();
  const timeMax = new Date(ey, em - 1, ed + 1, 0, 0, 0, 0).toISOString();

  const results = await Promise.allSettled(
    calIds.map(async (calId) => {
      const url = new URL(`${CAL_API}/calendars/${encodeURIComponent(calId)}/events`);
      url.searchParams.set("timeMin", timeMin);
      url.searchParams.set("timeMax", timeMax);
      url.searchParams.set("singleEvents", "true");
      url.searchParams.set("orderBy", "startTime");
      url.searchParams.set("maxResults", "250");

      const resp = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!resp.ok) return [] as RawCalendarEvent[];
      const data = (await resp.json()) as { items?: unknown[] };
      return (data.items ?? [])
        .map((item) => normalizeEvent(item as Parameters<typeof normalizeEvent>[0]))
        .filter((e): e is RawCalendarEvent => e !== null);
    })
  );

  const seen = new Set<string>();
  const merged: RawCalendarEvent[] = [];
  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    for (const ev of r.value) {
      const key = `${ev.id}:${ev.start.dateTime ?? ev.start.date ?? ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(ev);
    }
  }

  merged.sort((a, b) => {
    const ta = a.start.dateTime ?? a.start.date ?? "";
    const tb = b.start.dateTime ?? b.start.date ?? "";
    return ta < tb ? -1 : ta > tb ? 1 : 0;
  });

  if (typeof window !== "undefined") writeCache(cacheKey, merged);
  return merged;
}

export const CALENDAR_READONLY_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";
export { CALENDAR_WRITE_SCOPE } from "../calendar/calendar-write";
