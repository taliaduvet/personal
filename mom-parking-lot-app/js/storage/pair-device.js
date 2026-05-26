import { STORAGE_PREFIX, HAS_CHOSEN_SOLO_KEY } from '../constants.js';
import { IS_MOM_APP } from '../config/app-profile.js';
import { state } from '../state.js';
import { migrateStoragePrefixIfNeeded } from './local.js';
import { ensureMomPrefixedSyncId, ensureMomStorageIsolation } from './mom-isolation.js';

export function loadPairState() {
  if (IS_MOM_APP) ensureMomStorageIsolation();
  else migrateStoragePrefixIfNeeded();
  state.pairId = localStorage.getItem(STORAGE_PREFIX + 'pairId');
  state.addedBy = localStorage.getItem(STORAGE_PREFIX + 'addedBy') || 'Talia';
}

export function hasChosenSolo() {
  return localStorage.getItem(HAS_CHOSEN_SOLO_KEY) === 'true';
}

export function setChosenSolo() {
  localStorage.setItem(HAS_CHOSEN_SOLO_KEY, 'true');
}

export function savePairState() {
  if (state.pairId) localStorage.setItem(STORAGE_PREFIX + 'pairId', state.pairId);
  if (state.addedBy) localStorage.setItem(STORAGE_PREFIX + 'addedBy', state.addedBy);
}

export function loadDeviceSyncState() {
  if (IS_MOM_APP) ensureMomStorageIsolation();
  else migrateStoragePrefixIfNeeded();
  const raw = localStorage.getItem(STORAGE_PREFIX + 'deviceSyncId');
  state.deviceSyncId = IS_MOM_APP && raw ? ensureMomPrefixedSyncId(raw) : raw;
}

export function saveDeviceSyncState() {
  if (!state.deviceSyncId) return;
  const id = IS_MOM_APP ? ensureMomPrefixedSyncId(state.deviceSyncId) : state.deviceSyncId;
  state.deviceSyncId = id;
  localStorage.setItem(STORAGE_PREFIX + 'deviceSyncId', id);
}
