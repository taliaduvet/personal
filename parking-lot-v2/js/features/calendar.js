/**
 * Google Calendar integration.
 * Uses Google Identity Services (GIS) for client-side OAuth2 token flow.
 * No backend required — the user provides their own Google Cloud Client ID.
 *
 * Setup: Settings → Google Calendar → paste Client ID → Connect.
 * The access token is cached in localStorage and silently refreshed on expiry.
 */

const STORAGE_TOKEN_KEY = 'gcal_token_v1';
const STORAGE_CLIENT_KEY = 'gcal_client_id';
const STORAGE_EVENTS_KEY = 'gcal_events_cache_v1';
const SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';
const CAL_API = 'https://www.googleapis.com/calendar/v3';

/** @type {string|null} */
let _accessToken = null;
/** @type {number|null} */
let _tokenExpiry = null;
/** @type {any} */
let _gisClient = null;

// ── Token helpers ────────────────────────────────────────────────────────────

function loadCachedToken() {
  try {
    const raw = localStorage.getItem(STORAGE_TOKEN_KEY);
    if (!raw) return;
    const { token, expiry } = JSON.parse(raw);
    if (expiry > Date.now()) {
      _accessToken = token;
      _tokenExpiry = expiry;
    } else {
      localStorage.removeItem(STORAGE_TOKEN_KEY);
    }
  } catch { /* ignore */ }
}

function saveToken(token, expiresInSec) {
  _accessToken = token;
  _tokenExpiry = Date.now() + (Number(expiresInSec) - 60) * 1000;
  localStorage.setItem(STORAGE_TOKEN_KEY, JSON.stringify({ token, expiry: _tokenExpiry }));
}

function clearToken() {
  _accessToken = null;
  _tokenExpiry = null;
  localStorage.removeItem(STORAGE_TOKEN_KEY);
  localStorage.removeItem(STORAGE_EVENTS_KEY);
}

export function isConnected() {
  return !!((_accessToken && _tokenExpiry && _tokenExpiry > Date.now()));
}

export function getClientId() {
  return localStorage.getItem(STORAGE_CLIENT_KEY) || '';
}

export function saveClientId(id) {
  const trimmed = (id || '').trim();
  if (trimmed) localStorage.setItem(STORAGE_CLIENT_KEY, trimmed);
  else localStorage.removeItem(STORAGE_CLIENT_KEY);
}

export function disconnect() {
  clearToken();
  _gisClient = null;
}

// ── GIS loader ───────────────────────────────────────────────────────────────

function ensureGsiLoaded() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  return new Promise((resolve, reject) => {
    if (document.querySelector('script[src*="accounts.google.com/gsi"]')) {
      // Script tag already exists — wait for it
      let tries = 0;
      const poll = setInterval(() => {
        if (window.google?.accounts?.oauth2) { clearInterval(poll); resolve(); }
        if (++tries > 40) { clearInterval(poll); reject(new Error('GIS load timeout')); }
      }, 250);
      return;
    }
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = resolve;
    s.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(s);
  });
}

// ── Connect / OAuth ───────────────────────────────────────────────────────────

/**
 * Opens the Google OAuth consent popup. Resolves with the access token.
 * @param {string} clientId
 * @returns {Promise<string>}
 */
export async function connect(clientId) {
  await ensureGsiLoaded();
  saveClientId(clientId);
  return new Promise((resolve, reject) => {
    _gisClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      callback: (resp) => {
        if (resp.error) return reject(new Error(resp.error_description || resp.error));
        saveToken(resp.access_token, resp.expires_in);
        resolve(resp.access_token);
      }
    });
    _gisClient.requestAccessToken({ prompt: '' });
  });
}

/**
 * Try to get a fresh token silently (no popup). Returns false if not possible.
 * @returns {Promise<boolean>}
 */
export async function silentRefresh() {
  const clientId = getClientId();
  if (!clientId) return false;
  try {
    await ensureGsiLoaded();
    return await new Promise((resolve) => {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPE,
        callback: (resp) => {
          if (resp.error || !resp.access_token) { resolve(false); return; }
          saveToken(resp.access_token, resp.expires_in);
          resolve(true);
        }
      });
      client.requestAccessToken({ prompt: 'none' });
    });
  } catch {
    return false;
  }
}

// ── Calendar API ─────────────────────────────────────────────────────────────

/**
 * Fetches events from the primary calendar.
 * @param {string} timeMin ISO string
 * @param {string} timeMax ISO string
 * @returns {Promise<GCalEvent[]|null>}
 */
async function fetchEvents(timeMin, timeMax) {
  if (!isConnected()) {
    // Try silent refresh before giving up
    const ok = await silentRefresh();
    if (!ok) return null;
  }

  const url = new URL(`${CAL_API}/calendars/primary/events`);
  url.searchParams.set('timeMin', timeMin);
  url.searchParams.set('timeMax', timeMax);
  url.searchParams.set('singleEvents', 'true');
  url.searchParams.set('orderBy', 'startTime');
  url.searchParams.set('maxResults', '50');

  const resp = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${_accessToken}` }
  });

  if (resp.status === 401) {
    clearToken();
    return null;
  }
  if (!resp.ok) return null;
  const data = await resp.json();
  return data.items || [];
}

/** @typedef {{ id: string, summary: string, start: { dateTime?: string, date?: string }, end: { dateTime?: string, date?: string }, allDay?: boolean }} GCalEvent */

/**
 * Returns events for today, from midnight to midnight local time.
 * Results are cached for 5 minutes.
 * @returns {Promise<GCalEvent[]|null>}
 */
export async function getTodayEvents() {
  const cacheKey = `today_${new Date().toLocaleDateString()}`;
  const cached = readCache(cacheKey, 5 * 60 * 1000);
  if (cached) return cached;

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const events = await fetchEvents(start.toISOString(), end.toISOString());
  if (events) writeCache(cacheKey, events);
  return events;
}

/**
 * Returns events for a full calendar week starting on the given Monday.
 * @param {Date} mondayDate
 * @returns {Promise<GCalEvent[]|null>}
 */
export async function getWeekEvents(mondayDate) {
  const key = `week_${mondayDate.toISOString().slice(0, 10)}`;
  const cached = readCache(key, 10 * 60 * 1000);
  if (cached) return cached;

  const end = new Date(mondayDate);
  end.setDate(end.getDate() + 7);
  const events = await fetchEvents(mondayDate.toISOString(), end.toISOString());
  if (events) writeCache(key, events);
  return events;
}

// ── Simple event cache ────────────────────────────────────────────────────────

function readCache(key, maxAgeMs) {
  try {
    const raw = localStorage.getItem(STORAGE_EVENTS_KEY);
    if (!raw) return null;
    const store = JSON.parse(raw);
    const entry = store[key];
    if (!entry) return null;
    if (Date.now() - entry.ts > maxAgeMs) return null;
    return entry.data;
  } catch { return null; }
}

function writeCache(key, data) {
  try {
    const raw = localStorage.getItem(STORAGE_EVENTS_KEY);
    const store = raw ? JSON.parse(raw) : {};
    store[key] = { ts: Date.now(), data };
    localStorage.setItem(STORAGE_EVENTS_KEY, JSON.stringify(store));
  } catch { /* storage full — skip cache */ }
}

// ── Render helpers ────────────────────────────────────────────────────────────

/**
 * Format a calendar event time as "2:30 PM" or "All day".
 * @param {GCalEvent} ev
 * @returns {string}
 */
export function formatEventTime(ev) {
  if (!ev.start.dateTime) return 'All day';
  const d = new Date(ev.start.dateTime);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/**
 * Format event as "2:30–4:00 PM".
 * @param {GCalEvent} ev
 * @returns {string}
 */
export function formatEventRange(ev) {
  if (!ev.start.dateTime || !ev.end.dateTime) return 'All day';
  const s = new Date(ev.start.dateTime);
  const e = new Date(ev.end.dateTime);
  const fmt = (d) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return `${fmt(s)}–${fmt(e)}`;
}

/**
 * Given a list of events for a day, calculate approximate free hours
 * assuming an 8-hour workday (9am–5pm).
 * @param {GCalEvent[]} events
 * @param {string} dateYMD  YYYY-MM-DD of the day
 * @returns {number} free hours (0–8), rounded to 0.5
 */
export function calcFreeHours(events, dateYMD) {
  const WORK_START = 9 * 60;  // 9am in minutes
  const WORK_END = 17 * 60;   // 5pm
  const WORK_MINS = WORK_END - WORK_START;

  let busyMins = 0;
  for (const ev of events) {
    if (!ev.start.dateTime) continue; // all-day events don't block focus time
    const s = new Date(ev.start.dateTime);
    const e = new Date(ev.end.dateTime);
    const evDate = s.toISOString().slice(0, 10);
    if (evDate !== dateYMD) continue;
    const startMin = Math.max(s.getHours() * 60 + s.getMinutes(), WORK_START);
    const endMin = Math.min(e.getHours() * 60 + e.getMinutes(), WORK_END);
    if (endMin > startMin) busyMins += endMin - startMin;
  }
  busyMins = Math.min(busyMins, WORK_MINS);
  const free = (WORK_MINS - busyMins) / 60;
  return Math.round(free * 2) / 2;
}

// Boot: attempt to restore cached token on module load
loadCachedToken();
