/**
 * Weekly plan + pre-plan review helpers (pure functions, no DOM).
 */
import { parseLocalDate, getSortReferenceDate, sortByTimeBandsAndFriction, getTodayLocalYYYYMMDD } from './tasks.js';
import { getPileName } from './piles-people.js';

/** @typedef {{ anchorWeekStart: string | null, days: Record<string, { pileId: string | null, orderedTaskIds: string[] }> }} WeekPlan */

/**
 * Monday (local) of the week containing `d`, as YYYY-MM-DD.
 * @param {Date} [d]
 */
export function getMondayYYYYMMDD(d = new Date()) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const dd = String(x.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + dd;
}

/**
 * @param {string} mondayStr YYYY-MM-DD (Monday)
 * @returns {string[]} seven date keys Mon..Sun
 */
export function getWeekDateKeys(mondayStr) {
  const m = mondayStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return [];
  const start = new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
  const out = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    out.push(y + '-' + mo + '-' + dd);
  }
  return out;
}

/** @param {WeekPlan | null | undefined} wp */
export function normalizeWeekPlan(wp) {
  if (!wp || typeof wp !== 'object') return { anchorWeekStart: null, days: {} };
  const days = {};
  if (wp.days && typeof wp.days === 'object') {
    Object.keys(wp.days).forEach(k => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(k)) return;
      const e = wp.days[k];
      days[k] = {
        pileId: e && e.pileId != null ? e.pileId : null,
        orderedTaskIds: Array.isArray(e && e.orderedTaskIds) ? [...e.orderedTaskIds] : []
      };
    });
  }
  return {
    anchorWeekStart: typeof wp.anchorWeekStart === 'string' ? wp.anchorWeekStart : null,
    days
  };
}

/**
 * @returns {'no_week' | 'blank_today' | 'with_plan'}
 */
export function getTodayLayoutMode(weekPlan, todayKey) {
  const wp = normalizeWeekPlan(weekPlan);
  if (!wp.anchorWeekStart) return 'no_week';
  const day = wp.days[todayKey];
  if (!day || day.pileId == null || day.pileId === '') return 'blank_today';
  return 'with_plan';
}

/**
 * Remove task id from every day's ordered lists (for uniqueness across week).
 * @param {WeekPlan} wp
 * @param {string} taskId
 */
export function removeTaskIdFromAllDays(wp, taskId) {
  const out = normalizeWeekPlan(wp);
  Object.keys(out.days).forEach(k => {
    out.days[k].orderedTaskIds = (out.days[k].orderedTaskIds || []).filter(id => id !== taskId);
  });
  return out;
}

/**
 * @param {WeekPlan} wp
 * @param {string} dateKey
 * @param {string} taskId
 * @param {'top' | 'bottom'} position
 */
export function insertTaskInDayOrder(wp, dateKey, taskId, position) {
  let next = removeTaskIdFromAllDays(wp, taskId);
  if (!next.days[dateKey]) {
    next.days[dateKey] = { pileId: null, orderedTaskIds: [] };
  }
  const list = [...(next.days[dateKey].orderedTaskIds || [])].filter(id => id !== taskId);
  if (position === 'top') list.unshift(taskId);
  else list.push(taskId);
  next.days[dateKey].orderedTaskIds = list;
  return next;
}

/**
 * Drop ordered ids that reference missing tasks or wrong pile.
 * @param {import('./tasks.js').Item[]} items
 * @param {WeekPlan} wp
 */
export function pruneWeekPlan(items, wp) {
  const norm = normalizeWeekPlan(wp);
  const byId = {};
  (items || []).forEach(i => { byId[i.id] = i; });
  Object.keys(norm.days).forEach(k => {
    const e = norm.days[k];
    const pid = e.pileId;
    e.orderedTaskIds = (e.orderedTaskIds || []).filter(id => {
      const it = byId[id];
      if (!it || it.archived) return false;
      if (pid == null) return false;
      return (it.pileId || null) === pid;
    });
  });
  return norm;
}

/**
 * Union of all ordered task ids in snapshot.
 * @param {WeekPlan | null} snapshot
 */
export function unionSnapshotOrderedIds(snapshot) {
  const wp = normalizeWeekPlan(snapshot);
  const set = new Set();
  Object.keys(wp.days).forEach(k => {
    (wp.days[k].orderedTaskIds || []).forEach(id => set.add(id));
  });
  return set;
}

/**
 * @param {import('../state.js').state} stateLike
 * @param {string} todayKey
 * @param {import('./tasks.js').Item[]} items active + archived
 */
export function computePlanReview(lastCommittedSnapshot, items) {
  const snap = normalizeWeekPlan(lastCommittedSnapshot);
  const plannedIds = unionSnapshotOrderedIds(snap);
  const byId = {};
  (items || []).forEach(i => { byId[i.id] = i; });

  const planned = [];
  Object.keys(snap.days).sort().forEach(dateKey => {
    const e = snap.days[dateKey];
    const pileName = e.pileId ? (getPileName(e.pileId) || e.pileId) : '—';
    (e.orderedTaskIds || []).forEach(id => {
      const it = byId[id];
      planned.push({ dateKey, pileName, id, text: it ? it.text : '(missing)' });
    });
  });

  const done = [];
  const still = [];
  plannedIds.forEach(id => {
    const it = byId[id];
    if (!it) return;
    if (it.archived) done.push({ id, text: it.text });
    else still.push({ id, text: it.text });
  });

  const newInPiles = [];
  (items || []).forEach(it => {
    if (it.archived || !it.pileId) return;
    if (plannedIds.has(it.id)) return;
    if (still.some(s => s.id === it.id)) return;
    newInPiles.push({
      id: it.id,
      text: it.text,
      pileName: getPileName(it.pileId) || it.pileId
    });
  });

  return { planned, done, still, newInPiles };
}

/**
 * No week plan: explicit ids first (order = `explicitIds`), then dated today/overdue (sorted), deduped.
 * @param {Set<string>|string[]|null|undefined} [hiddenFromToday]
 */
export function getSingleListNoPlanItems(items, todayKey, explicitIds, hiddenFromToday) {
  const hidden =
    hiddenFromToday instanceof Set
      ? hiddenFromToday
      : new Set(Array.isArray(hiddenFromToday) ? hiddenFromToday : []);
  const active = (items || []).filter(i => !i.archived);
  const explicit = explicitIds || [];
  const byId = {};
  active.forEach(i => { byId[i.id] = i; });
  const t = parseLocalDate(todayKey);
  if (!t) return [];
  t.setHours(0, 0, 0, 0);
  const end = new Date(t);
  end.setDate(end.getDate() + 1);
  const seen = new Set();
  const explicitItems = [];
  explicit.forEach(id => {
    const item = byId[id];
    if (!item || seen.has(id) || hidden.has(id)) return;
    seen.add(id);
    explicitItems.push(item);
  });
  const datedItems = [];
  active.forEach(item => {
    if (seen.has(item.id) || hidden.has(item.id)) return;
    const ref = getSortReferenceDate(item);
    const inDate = ref && !isNaN(ref.getTime()) && ref < end;
    if (inDate) {
      seen.add(item.id);
      datedItems.push(item);
    }
  });
  return [...explicitItems, ...sortByTimeBandsAndFriction(datedItems)];
}

/**
 * Tasks for "Other": dated today/overdue, not in focus pile, active.
 */
export function getOtherDatedTasks(items, todayKey, plannedPileId) {
  const active = (items || []).filter(i => !i.archived);
  return active.filter(item => {
    const ref = getSortReferenceDate(item);
    if (!ref || isNaN(ref.getTime())) return false;
    const t = parseLocalDate(todayKey);
    if (!t) return false;
    t.setHours(0, 0, 0, 0);
    const end = new Date(t);
    end.setDate(end.getDate() + 1);
    if (ref >= end) return false;
    const pid = item.pileId != null ? item.pileId : null;
    if (plannedPileId == null) return true;
    return pid !== plannedPileId;
  });
}

/**
 * "Other" when today has a planned pile: dated (not in pile) ∪ explicit ids whose pile ≠ planned pile (or no pile).
 * @param {Set<string>|string[]|null|undefined} [hiddenFromToday]
 */
export function getOtherBlockTasks(items, todayKey, plannedPileId, explicitIds, hiddenFromToday) {
  const hidden =
    hiddenFromToday instanceof Set
      ? hiddenFromToday
      : new Set(Array.isArray(hiddenFromToday) ? hiddenFromToday : []);
  const dated = getOtherDatedTasks(items, todayKey, plannedPileId).filter(i => !hidden.has(i.id));
  const active = (items || []).filter(i => !i.archived);
  const byId = {};
  active.forEach(i => { byId[i.id] = i; });
  const seen = new Set(dated.map(i => i.id));
  const out = [...dated];
  (explicitIds || []).forEach(id => {
    if (seen.has(id) || hidden.has(id)) return;
    const item = byId[id];
    if (!item) return;
    const pid = item.pileId != null ? item.pileId : null;
    if (plannedPileId != null && pid === plannedPileId) return;
    seen.add(id);
    out.push(item);
  });
  return sortByTimeBandsAndFriction(out);
}

/**
 * Focus pile tasks: ordered ids first, then rest in pile sorted.
 * @param {Set<string>|string[]|null|undefined} [hiddenFromToday] ids user removed from Today without completing
 */
export function getFocusPileTasks(items, todayKey, dayEntry, hiddenFromToday) {
  if (!dayEntry || !dayEntry.pileId) return [];
  const pileId = dayEntry.pileId;
  const ordered = dayEntry.orderedTaskIds || [];
  const hidden =
    hiddenFromToday instanceof Set
      ? hiddenFromToday
      : new Set(Array.isArray(hiddenFromToday) ? hiddenFromToday : []);
  const byId = {};
  (items || []).forEach(i => { byId[i.id] = i; });
  const out = [];
  ordered.forEach(id => {
    if (hidden.has(id)) return;
    const it = byId[id];
    if (it && !it.archived && (it.pileId || null) === pileId) out.push(it);
  });
  const inPile = (items || []).filter(
    i =>
      !i.archived &&
      (i.pileId || null) === pileId &&
      !ordered.includes(i.id) &&
      !hidden.has(i.id)
  );
  const sortedRest = sortByTimeBandsAndFriction(inPile);
  sortedRest.forEach(i => out.push(i));
  return out;
}

/**
 * Reorder within the Today / focus-pile list (full display order = ordered ids + rest of pile).
 * @param {import('./tasks.js').Item[]} items
 * @param {string} todayKey YYYY-MM-DD
 * @param {{ pileId: string | null, orderedTaskIds: string[] }} dayEntry
 * @param {string} taskId
 * @param {'up'|'down'} direction
 * @returns {string[] | null} new orderedTaskIds for the day, or null if unchanged
 */
export function swapFocusPileAdjacent(items, todayKey, dayEntry, taskId, direction, hiddenFromToday) {
  if (!dayEntry || !dayEntry.pileId) return null;
  const displayIds = getFocusPileTasks(items, todayKey, dayEntry, hiddenFromToday).map((i) => i.id);
  const idx = displayIds.indexOf(taskId);
  if (idx < 0) return null;
  const j = direction === 'up' ? idx - 1 : idx + 1;
  if (j < 0 || j >= displayIds.length) return null;
  const next = [...displayIds];
  const t = next[idx];
  next[idx] = next[j];
  next[j] = t;
  return next;
}

/**
 * When the stored anchor week is not this calendar week, move plan forward and keep a read-only copy for "Last week" in the overlay.
 * @param {WeekPlan | null | undefined} weekPlan
 * @param {string} currentMonday YYYY-MM-DD
 */
/** Clear all day entries for the current anchor week (footer Clear week). */
export function clearWeekDaysForAnchor(wp) {
  const n = normalizeWeekPlan(wp);
  n.days = {};
  return n;
}

export function rollWeekPlanIfStale(weekPlan, currentMonday) {
  const wp = normalizeWeekPlan(weekPlan);
  if (!wp.anchorWeekStart || wp.anchorWeekStart === currentMonday) {
    return { weekPlan: wp, previousWeekPlanSnapshot: null, rolled: false };
  }
  const prev = JSON.parse(JSON.stringify(wp));
  return {
    weekPlan: { anchorWeekStart: currentMonday, days: {} },
    previousWeekPlanSnapshot: prev,
    rolled: true
  };
}

export { getTodayLocalYYYYMMDD };
