import { STORAGE_PREFIX } from '../constants.js';
import { IS_MOM_APP } from '../config/app-profile.js';
import { state } from '../state.js';

/** Cloud + local sync ids for Mom never share a row with the couples app. */
export const MOM_DEVICE_SYNC_PREFIX = 'mom-';

const ISOLATION_KEY = STORAGE_PREFIX + 'storageIsolationV2';

const COUPLE_CATEGORY_IDS = new Set([
  'work', 'hobbies', 'life', 'other', 'misfit', 'stop2030barclay', 'cycles'
]);

/**
 * @param {string} id
 * @returns {string}
 */
export function ensureMomPrefixedSyncId(id) {
  const s = String(id || '').trim().toLowerCase().replace(/\s/g, '');
  if (!s) return s;
  if (s.startsWith(MOM_DEVICE_SYNC_PREFIX)) return s;
  return MOM_DEVICE_SYNC_PREFIX + s;
}

/**
 * @param {{ generatePairId?: () => string } | null} [talkAbout]
 * @returns {string}
 */
export function generateMomDeviceSyncId(talkAbout) {
  const base = talkAbout && typeof talkAbout.generatePairId === 'function'
    ? talkAbout.generatePairId()
    : 'dev' + Date.now().toString(36).slice(-6);
  return ensureMomPrefixedSyncId(base);
}

/**
 * @param {unknown} parsed
 * @returns {boolean}
 */
function looksLikeCouplesAppData(parsed) {
  if (!parsed || typeof parsed !== 'object') return false;
  if (parsed.categoryPreset && parsed.categoryPreset !== 'mom') return true;
  const items = Array.isArray(parsed.items) ? parsed.items : [];
  return items.some((i) => i && COUPLE_CATEGORY_IDS.has(i.category));
}

function clearMomLocalStorage() {
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(STORAGE_PREFIX) && key !== ISOLATION_KEY) keys.push(key);
  }
  keys.forEach((k) => localStorage.removeItem(k));
  state.pairId = null;
  state.deviceSyncId = null;
  state.addedBy = 'Talia';
  state.items = [];
  state.todaySuggestionIds = [];
  state.notes = [];
  state.piles = [];
  state.categoryPreset = 'mom';
  state.viewMode = 'piles';
}

/**
 * One-time fix: Mom and couples share github.io origin localStorage; old builds
 * copied couples keys or reused the same Supabase device_sync_id.
 */
/**
 * @returns {boolean} true when local Mom data was cleared (couples bleed-through fix)
 */
export function ensureMomStorageIsolation() {
  if (!IS_MOM_APP || typeof localStorage === 'undefined') return false;

  const syncId = localStorage.getItem(STORAGE_PREFIX + 'deviceSyncId');
  const dataRaw = localStorage.getItem(STORAGE_PREFIX + 'data');
  let pollutedData = false;
  if (dataRaw) {
    try {
      pollutedData = looksLikeCouplesAppData(JSON.parse(dataRaw));
    } catch {
      pollutedData = true;
    }
  }

  const syncIdPolluted = syncId && !syncId.startsWith(MOM_DEVICE_SYNC_PREFIX);
  const alreadyIsolated = localStorage.getItem(ISOLATION_KEY) === '1';
  let didReset = false;

  if (!alreadyIsolated || syncIdPolluted || pollutedData) {
    if (syncIdPolluted || pollutedData) {
      clearMomLocalStorage();
      didReset = true;
    }
    localStorage.setItem(ISOLATION_KEY, '1');
  }
  return didReset;
}
