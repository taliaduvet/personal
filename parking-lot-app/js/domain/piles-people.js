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

const PEOPLE_GROUPS = [
  { id: 'family', label: 'Family' },
  { id: 'romantic', label: 'Romantic' },
  { id: 'close_friends', label: 'Close friends' },
  { id: 'friends', label: 'Friends' },
  { id: 'acquaintances', label: 'Acquaintances' },
  { id: 'work', label: 'Work' }
];

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

function addPerson(attrs) {
  var name = (attrs && attrs.name != null) ? String(attrs.name).trim() : '';
  if (!name) return null;
  var group = (attrs && attrs.group && PEOPLE_GROUPS.some(function(g) { return g.id === attrs.group; })) ? attrs.group : 'friends';
  var id = 'person_' + Date.now() + '_' + Math.random().toString(36).slice(2);
  var person = {
    id: id,
    name: name,
    group: group,
    lastConnected: attrs && attrs.lastConnected != null ? attrs.lastConnected : null,
    reconnectRule: attrs && attrs.reconnectRule && { interval: attrs.reconnectRule.interval } ? attrs.reconnectRule : null,
    notes: (attrs && attrs.notes != null) ? String(attrs.notes) : null
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
  if (updates && updates.group != null && PEOPLE_GROUPS.some(function(g) { return g.id === updates.group; })) p.group = updates.group;
  if (updates && updates.lastConnected !== undefined) p.lastConnected = updates.lastConnected;
  if (updates && updates.reconnectRule !== undefined) p.reconnectRule = updates.reconnectRule;
  if (updates && updates.notes !== undefined) p.notes = updates.notes;
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
  getPeople,
  getPerson,
  getPersonName,
  addPerson,
  updatePerson,
  deletePerson,
  getReconnectIntervalMs,
  isOverdueToReconnect,
  addPile,
  updatePile,
  deletePile
};
