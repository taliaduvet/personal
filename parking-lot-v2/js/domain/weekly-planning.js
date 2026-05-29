/**
 * Weekly plan + pre-plan review helpers (pure functions, no DOM).
 */
import { parseLocalDate, getSortReferenceDate, sortByTimeBandsAndFriction, getTodayLocalYYYYMMDD } from './tasks.js';
import { getPileName } from './piles-people.js';

/** Max length for each day’s planning note (calendar column). */
export const WEEK_DAY_PLAN_NOTE_MAX_LEN = 400;

/** @typedef {{ anchorWeekStart: string | null, days: Record<string, { pileId: string | null, orderedTaskIds: string[], note: string, excludedTaskIds: string[] }> }} WeekPlan */

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

/**
 * Move a Monday anchor by whole weeks (local calendar).
 * @param {string} mondayYmd YYYY-MM-DD (should be a Monday; normalized if not)
 * @param {number} deltaWeeks
 * @returns {string | null}
 */
export function addWeeksToMonday(mondayYmd, deltaWeeks) {
  const d = parseLocalDate(mondayYmd);
  if (!d || !Number.isFinite(deltaWeeks)) return null;
  const mon = getMondayYYYYMMDD(d);
  const x = parseLocalDate(mon);
  if (!x) return null;
  x.setDate(x.getDate() + 7 * deltaWeeks);
  return getMondayYYYYMMDD(x);
}

/**
 * Copy only day entries that fall on the given calendar week (Mon–Sun keys).
 * Used so opening the planner for another week does not discard other weeks’ saved days.
 * @param {WeekPlan | null | undefined} wp
 * @param {string} mondayStr YYYY-MM-DD Monday of the target week
 */
export function extractDaysForCalendarWeek(wp, mondayStr) {
  const base = normalizeWeekPlan(wp);
  const allow = new Set(getWeekDateKeys(mondayStr));
  const days = {};
  Object.keys(base.days).forEach((k) => {
    if (!allow.has(k)) return;
    const e = base.days[k];
    days[k] = JSON.parse(
      JSON.stringify({
        pileId: e.pileId != null ? e.pileId : null,
        orderedTaskIds: Array.isArray(e.orderedTaskIds) ? [...e.orderedTaskIds] : [],
        note: typeof e.note === 'string' ? e.note : '',
        excludedTaskIds: Array.isArray(e.excludedTaskIds) ? [...e.excludedTaskIds] : []
      })
    );
  });
  return days;
}

/**
 * Replace only the calendar week in `sliceWp` inside `existingWp`, keeping all other date keys.
 * @param {WeekPlan | null | undefined} existingWp
 * @param {WeekPlan | null | undefined} sliceWp must have `anchorWeekStart` = Monday of the week being saved
 */
export function mergeWeekPlanSlice(existingWp, sliceWp) {
  const existing = normalizeWeekPlan(existingWp);
  const slice = normalizeWeekPlan(sliceWp);
  const mon = slice.anchorWeekStart;
  if (!mon) return existing;
  const inWeek = new Set(getWeekDateKeys(mon));
  const mergedDays = { ...existing.days };
  Object.keys(mergedDays).forEach((k) => {
    if (inWeek.has(k)) delete mergedDays[k];
  });
  Object.keys(slice.days).forEach((k) => {
    if (inWeek.has(k)) mergedDays[k] = slice.days[k];
  });
  return normalizeWeekPlan({ anchorWeekStart: mon, days: mergedDays });
}

/** @param {WeekPlan | null | undefined} wp */
export function normalizeWeekPlan(wp) {
  if (!wp || typeof wp !== 'object') return { anchorWeekStart: null, days: {} };
  const days = {};
  if (wp.days && typeof wp.days === 'object') {
    Object.keys(wp.days).forEach(k => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(k)) return;
      const e = wp.days[k];
      let note = '';
      if (e && typeof e.note === 'string') {
        note = e.note.replace(/\r\n/g, '\n');
        if (note.length > WEEK_DAY_PLAN_NOTE_MAX_LEN) {
          note = note.slice(0, WEEK_DAY_PLAN_NOTE_MAX_LEN);
        }
      }
      const pileId = e && e.pileId != null ? e.pileId : null;
      let excludedTaskIds = [];
      if (e && Array.isArray(e.excludedTaskIds)) {
        excludedTaskIds = [...new Set(e.excludedTaskIds.filter(id => typeof id === 'string' && id.length))];
      }
      days[k] = {
        pileId,
        orderedTaskIds: Array.isArray(e && e.orderedTaskIds) ? [...e.orderedTaskIds] : [],
        note,
        excludedTaskIds: pileId == null ? [] : excludedTaskIds
      };
    });
  }
  const anchor = typeof wp.anchorWeekStart === 'string' ? wp.anchorWeekStart : null;
  if (typeof wp.planNotes === 'string' && wp.planNotes.trim() && anchor) {
    const weekKeys = getWeekDateKeys(anchor);
    const monKey = weekKeys[0];
    if (monKey) {
      let legacy = wp.planNotes.replace(/\r\n/g, '\n');
      if (legacy.length > WEEK_DAY_PLAN_NOTE_MAX_LEN) {
        legacy = legacy.slice(0, WEEK_DAY_PLAN_NOTE_MAX_LEN);
      }
      if (!days[monKey]) {
        days[monKey] = { pileId: null, orderedTaskIds: [], note: legacy, excludedTaskIds: [] };
      } else if (!days[monKey].note) {
        days[monKey] = { ...days[monKey], note: legacy };
      }
    }
  }
  return {
    anchorWeekStart: anchor,
    days
  };
}

/**
 * @returns {'no_week' | 'blank_today' | 'with_plan'}
 * Uses **calendar date keys only** so advance planning and stale anchors do not hide today.
 */
export function getTodayLayoutMode(weekPlan, todayKey) {
  const wp = normalizeWeekPlan(weekPlan);
  if (!todayKey || !/^\d{4}-\d{2}-\d{2}$/.test(todayKey)) return 'no_week';
  const day = wp.days[todayKey];
  if (!day) return 'no_week';
  if (day.pileId == null || day.pileId === '') return 'blank_today';
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
    out.days[k].excludedTaskIds = (out.days[k].excludedTaskIds || []).filter(id => id !== taskId);
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
    next.days[dateKey] = { pileId: null, orderedTaskIds: [], note: '', excludedTaskIds: [] };
  }
  const list = [...(next.days[dateKey].orderedTaskIds || [])].filter(id => id !== taskId);
  if (position === 'top') list.unshift(taskId);
  else list.push(taskId);
  next.days[dateKey].orderedTaskIds = list;
  next.days[dateKey].excludedTaskIds = (next.days[dateKey].excludedTaskIds || []).filter(id => id !== taskId);
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
    e.excludedTaskIds = (e.excludedTaskIds || []).filter(id => {
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
  const excluded = new Set(dayEntry.excludedTaskIds || []);
  const hidden =
    hiddenFromToday instanceof Set
      ? hiddenFromToday
      : new Set(Array.isArray(hiddenFromToday) ? hiddenFromToday : []);
  const byId = {};
  (items || []).forEach(i => { byId[i.id] = i; });
  const out = [];
  ordered.forEach(id => {
    if (hidden.has(id) || excluded.has(id)) return;
    const it = byId[id];
    if (it && !it.archived && (it.pileId || null) === pileId) out.push(it);
  });
  const inPile = (items || []).filter(
    i =>
      !i.archived &&
      (i.pileId || null) === pileId &&
      !ordered.includes(i.id) &&
      !hidden.has(i.id) &&
      !excluded.has(i.id)
  );
  const sortedRest = sortByTimeBandsAndFriction(inPile);
  sortedRest.forEach(i => out.push(i));
  return out;
}

/**
 * Reorder within the Today / focus-pile list (full display order = ordered ids + rest of pile).
 * @param {import('./tasks.js').Item[]} items
 * @param {string} todayKey YYYY-MM-DD
 * @param {{ pileId: string | null, orderedTaskIds: string[], note?: string, excludedTaskIds?: string[] }} dayEntry
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
 * When the stored anchor week is **before** the current calendar week, roll forward to this Monday
 * and keep a read-only copy for "Last week" in the overlay.
 * Plans for a **future** week (e.g. next week planned from Sunday) are left unchanged.
 * @param {WeekPlan | null | undefined} weekPlan
 * @param {string} currentMonday YYYY-MM-DD
 */
/** Remove only day keys that belong to the plan’s anchor week (footer Clear week). */
export function clearWeekDaysForAnchor(wp) {
  const n = normalizeWeekPlan(wp);
  const anchor = n.anchorWeekStart;
  if (!anchor) {
    n.days = {};
    return n;
  }
  const inWeek = new Set(getWeekDateKeys(anchor));
  Object.keys(n.days).forEach((k) => {
    if (inWeek.has(k)) delete n.days[k];
  });
  return n;
}

/**
 * Historical name kept for callers. We no longer rewrite or shift the plan when the calendar week changes —
 * `days` stay on absolute YYYY-MM-DD keys for advance planning.
 */
export function rollWeekPlanIfStale(weekPlan, currentMonday) {
  void currentMonday;
  return { weekPlan: normalizeWeekPlan(weekPlan), previousWeekPlanSnapshot: null, rolled: false };
}

export { getTodayLocalYYYYMMDD };
