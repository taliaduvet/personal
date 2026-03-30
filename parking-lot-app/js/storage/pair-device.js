import { STORAGE_PREFIX, HAS_CHOSEN_SOLO_KEY } from '../constants.js';
import { state } from '../state.js';

export function loadPairState() {
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
  state.deviceSyncId = localStorage.getItem(STORAGE_PREFIX + 'deviceSyncId');
}

export function saveDeviceSyncState() {
  if (state.deviceSyncId) localStorage.setItem(STORAGE_PREFIX + 'deviceSyncId', state.deviceSyncId);
}
