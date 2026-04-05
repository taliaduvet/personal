import { STORAGE_PREFIX } from '../constants.js';
import { state } from '../state.js';
import { normalizeJournalDayValue } from '../domain/journal-daily.js';
import { seedPeopleGroupsIfEmpty } from '../domain/piles-people.js';

let storageNotify = (msg) => {
  console.warn(msg);
};

export function setStorageNotify(fn) {
  if (typeof fn === 'function') storageNotify = fn;
}

let cloudSyncHook = null;

export function setCloudSyncHook(fn) {
  cloudSyncHook = typeof fn === 'function' ? fn : () => {};
}

export function getTallyDate() {
  const n = new Date();
  const hour = (state.tallyResetHour != null && state.tallyResetHour >= 0 && state.tallyResetHour <= 23)
    ? state.tallyResetHour : 3;
  if (n.getHours() < hour) n.setDate(n.getDate() - 1);
  return n.toDateString();
}

export function getTallyDateYYYYMMDD() {
  const n = new Date();
  const hour = (state.tallyResetHour != null && state.tallyResetHour >= 0 && state.tallyResetHour <= 23)
    ? state.tallyResetHour : 3;
  if (n.getHours() < hour) n.setDate(n.getDate() - 1);
  const y = n.getFullYear();
  const m = String(n.getMonth() + 1).padStart(2, '0');
  const d = String(n.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + d;
}

export function countCompletedInTallyDay() {
  const hour = (state.tallyResetHour != null && state.tallyResetHour >= 0 && state.tallyResetHour <= 23)
    ? state.tallyResetHour : 3;
  const now = new Date();
  const start = new Date(now);
  start.setHours(hour, 0, 0, 0);
  if (now.getHours() < hour) start.setDate(start.getDate() - 1);
  const startMs = start.getTime();
  return state.items.filter(i => i.completedAt && i.completedAt >= startMs).length;
}

export function loadState() {
  try {
    const stored = localStorage.getItem(STORAGE_PREFIX + 'data');
    if (stored) {
      const parsed = JSON.parse(stored);
      state.items = (parsed.items || []).map(i => ({ ...i, doingDate: i.doingDate || null }));
      state.todaySuggestionIds = parsed.todaySuggestionIds || [];
      state.lastCategory = parsed.lastCategory || 'life';
      state.customLabels = parsed.customLabels || {};
      state.categoryPreset = parsed.categoryPreset || 'generic';
      state.buttonColor = parsed.buttonColor || null;
      state.textColor = parsed.textColor || null;
      state.displayName = parsed.displayName || '';
      if (parsed.columnColors && Object.keys(parsed.columnColors).length) state.columnColors = parsed.columnColors;
      if (Array.isArray(parsed.columnOrder) && parsed.columnOrder.length) state.columnOrder = parsed.columnOrder;
      if (typeof parsed.tallyResetHour === 'number' && parsed.tallyResetHour >= 0 && parsed.tallyResetHour <= 23) state.tallyResetHour = parsed.tallyResetHour;
      if (Array.isArray(parsed.piles)) state.piles = parsed.piles;
      if (parsed.viewMode === 'piles' || parsed.viewMode === 'columns') state.viewMode = parsed.viewMode;
      if (typeof parsed.showSuggestNext === 'boolean') state.showSuggestNext = parsed.showSuggestNext;
      if (parsed.columnNotes && typeof parsed.columnNotes === 'object') state.columnNotes = parsed.columnNotes;
      if (typeof parsed.lastSeed === 'string') state.lastSeed = parsed.lastSeed;
      if (Array.isArray(parsed.seedReflections)) state.seedReflections = parsed.seedReflections;
      if (Array.isArray(parsed.habits)) state.habits = parsed.habits;
      if (Array.isArray(parsed.habitCompletions)) state.habitCompletions = parsed.habitCompletions;
      if (parsed.journalDailyOpenEntryByDate && typeof parsed.journalDailyOpenEntryByDate === 'object') {
        state.journalDailyOpenEntryByDate = { ...parsed.journalDailyOpenEntryByDate };
      }
      if (parsed.journalDaily && typeof parsed.journalDaily === 'object') {
        state.journalDaily = {};
        const keyRe = /^\d{4}-\d{2}-\d{2}$/;
        function toYYYYMMDD(key) {
          if (keyRe.test(key)) return key;
          const d = new Date(key);
          if (isNaN(d.getTime())) return null;
          const y = d.getFullYear();
          const mo = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return y + '-' + mo + '-' + day;
        }
        Object.keys(parsed.journalDaily).forEach(function(k) {
          const val = parsed.journalDaily[k];
          const canonical = toYYYYMMDD(k);
          if (!canonical) return;
          state.journalDaily[canonical] = normalizeJournalDayValue(val);
        });
      }
      if (Array.isArray(parsed.peopleGroups) && parsed.peopleGroups.length) {
        state.peopleGroups = parsed.peopleGroups.filter(function(g) {
          return g && typeof g.id === 'string' && typeof g.label === 'string';
        });
      }
      if (Array.isArray(parsed.people)) state.people = parsed.people;
    }
    seedPeopleGroupsIfEmpty();
    if (!state.journalDaily || typeof state.journalDaily !== 'object') state.journalDaily = {};
    if (!state.journalDailyOpenEntryByDate || typeof state.journalDailyOpenEntryByDate !== 'object') {
      state.journalDailyOpenEntryByDate = {};
    }
    if (!Array.isArray(state.people)) state.people = [];
    const peopleIds = (state.people || []).map(function(p) { return p.id; });
    state.items = (state.items || []).map(i => ({
      ...i,
      pileId: i.pileId != null ? i.pileId : null,
      friction: i.friction && ['quick', 'medium', 'deep'].includes(i.friction) ? i.friction : null,
      firstStep: typeof i.firstStep === 'string' ? i.firstStep : null,
      personId: (i.personId && peopleIds.indexOf(i.personId) >= 0) ? i.personId : null
    }));
    state.completedTodayCount = countCompletedInTallyDay();
  } catch (e) {
    console.warn('Load failed', e);
    storageNotify('Could not load saved data — starting fresh');
  }
}

export function saveState(skipCloudSync, useRemoteTallyDate) {
  try {
    localStorage.setItem(STORAGE_PREFIX + 'data', JSON.stringify({
      items: state.items,
      todaySuggestionIds: state.todaySuggestionIds,
      lastCategory: state.lastCategory,
      customLabels: state.customLabels,
      categoryPreset: state.categoryPreset || 'generic',
      buttonColor: state.buttonColor,
      textColor: state.textColor,
      displayName: state.displayName || '',
      columnColors: state.columnColors || {},
      columnOrder: state.columnOrder || null,
      tallyResetHour: state.tallyResetHour != null ? state.tallyResetHour : 3,
      piles: state.piles || [],
      viewMode: state.viewMode || 'columns',
      showSuggestNext: state.showSuggestNext !== false,
      columnNotes: state.columnNotes || {},
      lastSeed: state.lastSeed || null,
      seedReflections: state.seedReflections || [],
      habits: state.habits || [],
      habitCompletions: state.habitCompletions || [],
      journalDaily: state.journalDaily || {},
      journalDailyOpenEntryByDate: state.journalDailyOpenEntryByDate || {},
      people: state.people || [],
      peopleGroups: state.peopleGroups || []
    }));
    const tallyDate = useRemoteTallyDate && state.lastCompletedDate ? state.lastCompletedDate : getTallyDate();
    localStorage.setItem(STORAGE_PREFIX + 'tally', JSON.stringify({
      count: state.completedTodayCount,
      date: tallyDate
    }));
    if (!skipCloudSync && window.talkAbout && state.deviceSyncId && cloudSyncHook) cloudSyncHook();
  } catch (e) {
    console.warn('Save failed', e);
    storageNotify('Could not save — check storage or try again');
  }
}
