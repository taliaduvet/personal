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

/** @param {number|null|undefined} ms */
function formatYmdFromMs(ms) {
  if (ms == null || typeof ms !== 'number' || isNaN(ms) || ms <= 0) return '';
  const dt = new Date(ms);
  return (
    dt.getFullYear() +
    '-' +
    String(dt.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(dt.getDate()).padStart(2, '0')
  );
}

/** @param {string|null|undefined} ymd */
function parseYmdToMs(ymd) {
  if (!ymd || typeof ymd !== 'string') return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return null;
  const ms = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).setHours(0, 0, 0, 0);
  return isNaN(ms) ? null : ms;
}

function todayYmd() {
  return formatYmdFromMs(Date.now());
}

function compareYmd(a, b) {
  if (!a || !b) return 0;
  return a < b ? -1 : a > b ? 1 : 0;
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
    agreedReconnectOn: attrs && attrs.agreedReconnectOn != null ? attrs.agreedReconnectOn : null,
    wantToImprove: !!(attrs && attrs.wantToImprove),
    email: attrs && attrs.email != null ? String(attrs.email).trim() || null : null,
    phone: attrs && attrs.phone != null ? String(attrs.phone).trim() || null : null,
    birthday: attrs && attrs.birthday != null ? String(attrs.birthday).trim() || null : null,
    talkAboutNext: attrs && attrs.talkAboutNext != null ? String(attrs.talkAboutNext).trim() || null : null,
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
  if (updates && updates.agreedReconnectOn !== undefined) p.agreedReconnectOn = updates.agreedReconnectOn;
  if (updates && updates.wantToImprove !== undefined) p.wantToImprove = !!updates.wantToImprove;
  if (updates && updates.email !== undefined) p.email = updates.email ? String(updates.email).trim() || null : null;
  if (updates && updates.phone !== undefined) p.phone = updates.phone ? String(updates.phone).trim() || null : null;
  if (updates && updates.birthday !== undefined) p.birthday = updates.birthday ? String(updates.birthday).trim() || null : null;
  if (updates && updates.talkAboutNext !== undefined) {
    p.talkAboutNext = updates.talkAboutNext ? String(updates.talkAboutNext).trim() || null : null;
  }
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

function isAgreedReconnectSnoozed(person) {
  if (!person || person.agreedReconnectOn == null) return false;
  const agreed = typeof person.agreedReconnectOn === 'number'
    ? formatYmdFromMs(person.agreedReconnectOn)
    : String(person.agreedReconnectOn).slice(0, 10);
  if (!agreed) return false;
  return compareYmd(todayYmd(), agreed) <= 0;
}

function getNextReconnectDueMs(person) {
  if (!person || !person.reconnectRule || !person.reconnectRule.interval) return null;
  const lc = person.lastConnected;
  if (typeof lc !== 'number' || isNaN(lc) || lc <= 0) return null;
  return lc + getReconnectIntervalMs(person.reconnectRule.interval);
}

function getNextReconnectDueYmd(person) {
  const dueMs = getNextReconnectDueMs(person);
  return dueMs ? formatYmdFromMs(dueMs) : null;
}

function isOverdueToReconnect(person) {
  if (!person || !person.reconnectRule || !person.reconnectRule.interval) return false;
  if (isAgreedReconnectSnoozed(person)) return false;
  const dueYmd = getNextReconnectDueYmd(person);
  if (!dueYmd) return false;
  return compareYmd(todayYmd(), dueYmd) >= 0;
}

/** @param {number} withinDays */
function getUpcomingBirthdays(withinDays) {
  const people = getPeople().filter((p) => p.birthday && /^\d{4}-\d{2}-\d{2}$/.test(p.birthday));
  if (!people.length) return [];
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const maxMs = todayStart + withinDays * 24 * 60 * 60 * 1000;
  const out = [];
  people.forEach((p) => {
    const parts = p.birthday.split('-');
    const month = Number(parts[1]);
    const day = Number(parts[2]);
    if (!month || !day) return;
    let year = today.getFullYear();
    let next = new Date(year, month - 1, day).getTime();
    if (next < todayStart) {
      year += 1;
      next = new Date(year, month - 1, day).getTime();
    }
    if (next <= maxMs) {
      const daysUntil = Math.round((next - todayStart) / (24 * 60 * 60 * 1000));
      out.push({ person: p, daysUntil, dateYmd: formatYmdFromMs(next) });
    }
  });
  out.sort((a, b) => a.daysUntil - b.daysUntil);
  return out;
}

/** @param {import('../types.js').Person} person */
function getPersonBirthdayDaysUntil(person, withinDays) {
  if (!person || !person.birthday) return null;
  const hit = getUpcomingBirthdays(withinDays).find((u) => u.person.id === person.id);
  return hit != null ? hit.daysUntil : null;
}

function getDefaultBirthdayReminderDays() {
  const n = state.birthdayReminderDays;
  if (typeof n === 'number' && n >= 1 && n <= 60) return n;
  return 14;
}

const INBOX_PILE_ID = 'pile_inbox';

function ensureInboxPile() {
  const list = state.piles || [];
  const existing = list.find(p => p.id === INBOX_PILE_ID);
  if (existing) return INBOX_PILE_ID;
  state.piles = [{ id: INBOX_PILE_ID, name: 'Inbox', permanent: true }, ...list];
  persist();
  return INBOX_PILE_ID;
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
  if (id === INBOX_PILE_ID) return 0;
  const list = (state.piles || []).filter(pi => pi.id !== id);
  const count = (state.items || []).filter(i => i.pileId === id).length;
  // Reroute orphaned tasks to inbox instead of leaving them unassigned
  ensureInboxPile();
  state.items.forEach(i => { if (i.pileId === id) i.pileId = INBOX_PILE_ID; });
  state.piles = list;
  persist();
  return count;
}

export {
  INBOX_PILE_ID,
  ensureInboxPile,
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
  formatYmdFromMs,
  parseYmdToMs,
  todayYmd,
  isAgreedReconnectSnoozed,
  getNextReconnectDueMs,
  getNextReconnectDueYmd,
  isOverdueToReconnect,
  getUpcomingBirthdays,
  getPersonBirthdayDaysUntil,
  getDefaultBirthdayReminderDays,
  addPile,
  updatePile,
  deletePile
};
