/**
 * Piles and people / relationships. Shapes: {@link import('../types.js').Pile}, {@link import('../types.js').Person}.
 */
import { persist } from '../core/persist.js';
import { state } from '../state.js';

function getPiles() {
  return (state.piles || []).slice();
}

function getPileName(pileId) {
  if (!pileId) return null;
  const p = (state.piles || []).find(pi => pi.id === pileId);
  return p ? p.name : pileId;
}

/** Default groups (seed into state.peopleGroups when empty). */
const PEOPLE_GROUPS = [
  { id: 'family', label: 'Family' },
  { id: 'romantic', label: 'Romantic' },
  { id: 'close_friends', label: 'Close friends' },
  { id: 'friends', label: 'Friends' },
  { id: 'acquaintances', label: 'Acquaintances' },
  { id: 'work', label: 'Work' }
];

function seedPeopleGroupsIfEmpty() {
  if (!state.peopleGroups || !state.peopleGroups.length) {
    state.peopleGroups = PEOPLE_GROUPS.map((g) => ({ ...g }));
  }
}

function getPeopleGroups() {
  seedPeopleGroupsIfEmpty();
  return (state.peopleGroups || []).slice();
}

function isValidPeopleGroupId(id) {
  return getPeopleGroups().some((g) => g.id === id);
}

function addPeopleGroup(label) {
  const trimmed = (label || '').trim();
  if (!trimmed) return null;
  seedPeopleGroupsIfEmpty();
  const id = 'grp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
  state.peopleGroups.push({ id, label: trimmed });
  persist();
  return id;
}

function renamePeopleGroup(id, label) {
  const trimmed = (label || '').trim();
  if (!trimmed) return;
  const g = (state.peopleGroups || []).find((x) => x.id === id);
  if (g) {
    g.label = trimmed;
    persist();
  }
}

function deletePeopleGroup(id) {
  seedPeopleGroupsIfEmpty();
  const remaining = (state.peopleGroups || []).filter((g) => g.id !== id);
  const fallback = remaining.find((g) => g.id === 'friends') || remaining[0];
  const fallbackId = fallback ? fallback.id : 'friends';
  (state.people || []).forEach((p) => {
    if (p.group === id) p.group = fallbackId;
  });
  state.peopleGroups = remaining.length ? remaining : PEOPLE_GROUPS.map((g) => ({ ...g }));
  persist();
}

function getPeople() {
  return (state.people || []).slice();
}

function getPerson(id) {
  if (!id) return null;
  return (state.people || []).find(p => p.id === id) || null;
}

function getPersonName(id) {
  const p = getPerson(id);
  return p ? p.name : (id || null);
}

function normalizeHistory(h) {
  if (!Array.isArray(h)) return [];
  return h
    .filter((x) => x && typeof x.text === 'string' && typeof x.at === 'number')
    .map((x) => ({ at: x.at, text: String(x.text) }))
    .sort((a, b) => b.at - a.at);
}

function addPerson(attrs) {
  var name = (attrs && attrs.name != null) ? String(attrs.name).trim() : '';
  if (!name) return null;
  seedPeopleGroupsIfEmpty();
  var group = (attrs && attrs.group && isValidPeopleGroupId(attrs.group)) ? attrs.group : 'friends';
  var id = 'person_' + Date.now() + '_' + Math.random().toString(36).slice(2);
  var person = {
    id: id,
    name: name,
    group: group,
    lastConnected: attrs && attrs.lastConnected != null ? attrs.lastConnected : null,
    reconnectRule: attrs && attrs.reconnectRule && { interval: attrs.reconnectRule.interval } ? attrs.reconnectRule : null,
    notes: (attrs && attrs.notes != null) ? String(attrs.notes) : null,
    history: normalizeHistory(attrs && attrs.history)
  };
  state.people = (state.people || []).concat(person);
  persist();
  return id;
}

function updatePerson(id, updates) {
  var p = getPerson(id);
  if (!p) return;
  if (updates && updates.name != null) {
    var n = String(updates.name).trim();
    if (n) p.name = n;
  }
  if (updates && updates.group != null && isValidPeopleGroupId(updates.group)) p.group = updates.group;
  if (updates && updates.lastConnected !== undefined) p.lastConnected = updates.lastConnected;
  if (updates && updates.reconnectRule !== undefined) p.reconnectRule = updates.reconnectRule;
  if (updates && updates.notes !== undefined) p.notes = updates.notes;
  if (updates && updates.history !== undefined) p.history = normalizeHistory(updates.history);
  persist();
}

function appendPersonHistory(id, text) {
  const t = (text || '').trim();
  if (!t) return;
  const p = getPerson(id);
  if (!p) return;
  const row = { at: Date.now(), text: t };
  p.history = normalizeHistory((p.history || []).concat([row]));
  persist();
}

function deletePerson(id) {
  state.items.forEach(function(item) {
    if (item.personId === id) item.personId = null;
  });
  state.people = (state.people || []).filter(p => p.id !== id);
  persist();
}

function getReconnectIntervalMs(interval) {
  if (interval === '1w') return 7 * 24 * 60 * 60 * 1000;
  if (interval === '2w') return 14 * 24 * 60 * 60 * 1000;
  if (interval === '1m') return 30 * 24 * 60 * 60 * 1000;
  if (interval === '3m') return 90 * 24 * 60 * 60 * 1000;
  return 0;
}

function isOverdueToReconnect(person) {
  if (!person || person.lastConnected == null || !person.reconnectRule || !person.reconnectRule.interval) return false;
  var lc = person.lastConnected;
  if (typeof lc !== 'number' || isNaN(lc) || lc <= 0) return false;
  var dueMs = lc + getReconnectIntervalMs(person.reconnectRule.interval);
  var today = new Date();
  var todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
  var dueDate = new Date(dueMs);
  var dueStr = dueDate.getFullYear() + '-' + String(dueDate.getMonth() + 1).padStart(2, '0') + '-' + String(dueDate.getDate()).padStart(2, '0');
  return todayStr >= dueStr;
}

function addPile(name) {
  const trimmed = (name || '').trim();
  if (!trimmed) return null;
  const id = 'pile_' + Date.now() + '_' + Math.random().toString(36).slice(2);
  const list = state.piles || [];
  list.push({ id, name: trimmed });
  state.piles = list;
  persist();
  return id;
}

function updatePile(id, name) {
  const trimmed = (name || '').trim();
  if (!trimmed) return;
  const p = (state.piles || []).find(pi => pi.id === id);
  if (p) {
    p.name = trimmed;
    persist();
  }
}

function deletePile(id) {
  const list = (state.piles || []).filter(pi => pi.id !== id);
  const count = (state.items || []).filter(i => i.pileId === id).length;
  state.items.forEach(i => { if (i.pileId === id) i.pileId = null; });
  state.piles = list;
  persist();
  return count;
}

export {
  getPiles,
  getPileName,
  PEOPLE_GROUPS,
  seedPeopleGroupsIfEmpty,
  getPeopleGroups,
  isValidPeopleGroupId,
  addPeopleGroup,
  renamePeopleGroup,
  deletePeopleGroup,
  getPeople,
  getPerson,
  getPersonName,
  addPerson,
  updatePerson,
  appendPersonHistory,
  deletePerson,
  getReconnectIntervalMs,
  isOverdueToReconnect,
  addPile,
  updatePile,
  deletePile
};
