/**
 * Task domain: parsing, sorting, and item helpers.
 * Data shape: {@link import('../types.js').Task}.
 */
import { MONTHS, PRIORITY_ORDER, DEFAULT_COLUMN_COLORS } from '../constants.js';
import { persist } from '../core/persist.js';
import { state } from '../state.js';

/**
 * @param {string} text
 * @returns {'daily'|'weekly'|'monthly'|null}
 */
function extractRecurrence(text) {
  const t = (text || '').toLowerCase();
  if (/\b(daily|every\s*day|each\s*day)\b/.test(t)) return 'daily';
  if (/\b(weekly|every\s*week|each\s*week)\b/.test(t)) return 'weekly';
  if (/\b(monthly|every\s*month|each\s*month)\b/.test(t)) return 'monthly';
  return null;
}

/**
 * @param {string} text
 * @returns {'quick'|'medium'|'deep'|null}
 */
function extractFriction(text) {
  const t = (text || '').toLowerCase();
  if (/\b(quick|easy|fast)\b/.test(t)) return 'quick';
  if (/\b(medium|normal)\b/.test(t)) return 'medium';
  if (/\b(deep|hard|long)\b/.test(t)) return 'deep';
  return null;
}

/**
 * @param {string} text
 * @returns {string|null}
 */
function extractDoingDate(text) {
  const t = (text || '').toLowerCase();
  // Prefer explicit "do/doing/on" hints when present.
  const hinted = t.match(/\b(?:do(?:ing)?|on)\s+(.+)$/i);
  const source = hinted ? hinted[1] : t;
  if (typeof window !== 'undefined' && window.chrono) {
    try {
      const parsed = window.chrono.parseDate(source);
      if (parsed && !isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
    } catch (e) { /* fallback to null */ }
  }
  return null;
}

/**
 * @param {string} text
 * @returns {string|null}
 */
function detectCategory(text) {
  const t = (text || '').toLowerCase();
  const preset = state.categoryPreset || 'generic';
  if (preset === 'creative') {
    if (t.includes('misfit')) return 'misfit';
    if (t.includes('barclay') || t.includes('stop 2030') || t.includes('stop2030')) return 'stop2030barclay';
    if (t.includes('cycles')) return 'cycles';
    if (t.includes('life')) return 'life';
  } else {
    if (t.includes('work')) return 'work';
    if (t.includes('hobbi') || t.includes('hobby')) return 'hobbies';
    if (t.includes('life')) return 'life';
  }
  return null;
}

/**
 * @param {string} text
 * @returns {string|null}
 */
function extractDeadline(text) {
  const t = (text || '').toLowerCase();
  const now = new Date();
  const year = now.getFullYear();

  const monthDay = t.match(/(?:due\s+)?(?:by\s+)?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})(?:\s+(\d{4}))?/i);
  if (monthDay) {
    const m = MONTHS[monthDay[1].toLowerCase().slice(0,3)];
    const d = parseInt(monthDay[2], 10);
    const y = monthDay[3] ? parseInt(monthDay[3], 10) : year;
    const date = new Date(y, m - 1, d);
    if (!isNaN(date.getTime())) return date.toISOString().slice(0, 10);
  }
  const slash = t.match(/(?:due\s+)?(?:by\s+)?(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/);
  if (slash) {
    const m = parseInt(slash[1], 10);
    const d = parseInt(slash[2], 10);
    const y = slash[3] ? (slash[3].length === 2 ? 2000 + parseInt(slash[3], 10) : parseInt(slash[3], 10)) : year;
    const date = new Date(y, m - 1, d);
    if (!isNaN(date.getTime())) return date.toISOString().slice(0, 10);
  }

  const dayNames = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  const nextDay = t.match(/(?:due\s+)?(?:by\s+)?(?:next|this)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i);
  if (nextDay) {
    const targetDay = dayNames.indexOf(nextDay[1].toLowerCase());
    const isThis = /this\s+/.test(t);
    let d = new Date(now);
    const currentDay = d.getDay();
    let diff = targetDay - currentDay;
    if (diff <= 0 && !isThis) diff += 7;
    else if (diff < 0 && isThis) diff += 7;
    else if (diff === 0 && isThis) diff = 0;
    else if (diff === 0) diff = 7;
    d.setDate(d.getDate() + diff);
    return d.toISOString().slice(0, 10);
  }

  const endOfMonth = t.match(/(?:due\s+)?(?:by\s+)?(?:the\s+)?(?:end\s+of\s+(?:the\s+)?month|eom)/i);
  if (endOfMonth) {
    const d = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return d.toISOString().slice(0, 10);
  }

  const inWeeks = t.match(/(?:due\s+)?(?:by\s+)?(?:in\s+)?(\d+)\s+weeks?(?:\s+from\s+now)?/i);
  if (inWeeks) {
    const d = new Date(now);
    d.setDate(d.getDate() + parseInt(inWeeks[1], 10) * 7);
    return d.toISOString().slice(0, 10);
  }

  const inDays = t.match(/(?:due\s+)?(?:by\s+)?(?:in\s+)?(\d+)\s+days?(?:\s+from\s+now)?/i);
  if (inDays) {
    const d = new Date(now);
    d.setDate(d.getDate() + parseInt(inDays[1], 10));
    return d.toISOString().slice(0, 10);
  }

  if (/\b(?:due\s+)?(?:by\s+)?tomorrow\b/i.test(t)) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }

  if (/\b(?:due\s+)?(?:by\s+)?next\s+week\b/i.test(t)) {
    const d = new Date(now);
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  }

  if (typeof window !== 'undefined' && window.chrono) {
    try {
      const parsed = window.chrono.parseDate(t);
      if (parsed && !isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
    } catch (e) { /* fallback to null */ }
  }
  return null;
}

/**
 * @param {string} text
 * @returns {'critical'|'high'|'medium'|'low'|null}
 */
function extractPriority(text) {
  const t = (text || '').toLowerCase();
  if (/\b(critical|urgent|asap|as\s+ap|emergency|rush|top\s+priority)\b/.test(t)) return 'critical';
  if (/\b(high\s+priority|high\s+prio|important|must\s+do|must\s+be)\b/.test(t)) return 'high';
  if (/\b(low\s+priority|low\s+prio|whenever|nice\s+to\s+have|optional|backlog)\b/.test(t)) return 'low';
  if (/\b(medium|normal|regular)\b/.test(t)) return 'medium';
  return null;
}

/**
 * @param {string} text
 * @param {string|null} category
 * @param {string|null} deadline
 * @param {string|null} priority
 * @returns {string}
 */
function stripAutoExtractedFromText(text, category, deadline, priority) {
  let result = (text || '').trim();
  if (!result) return result;
  if (deadline) {
    result = result.replace(/(?:due\s+)?(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}(?:\s+\d{4})?/gi, '');
    result = result.replace(/(?:due\s+)?\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?/gi, '');
    result = result.replace(/(?:due\s+)?(?:by\s+)?(?:the\s+)?end\s+of\s+(?:the\s+)?(?:next\s+)?month/gi, '');
    result = result.replace(/(?:due\s+)?(?:by\s+)?eom\b/gi, '');
    result = result.replace(/(?:due\s+)?(?:by\s+)?(?:next|this)\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)/gi, '');
    result = result.replace(/(?:due\s+)?(?:by\s+)?(?:in\s+)?\d+\s+(?:days?|weeks?)(?:\s+from\s+now)?/gi, '');
    result = result.replace(/(?:due\s+)?(?:by\s+)?tomorrow\b/gi, '');
    result = result.replace(/(?:due\s+)?(?:by\s+)?next\s+week\b/gi, '');
  }
  if (category) {
    if (category === 'work') result = result.replace(/\bwork\b/gi, '');
    if (category === 'hobbies') result = result.replace(/\bhobbies?\b/gi, '');
    if (category === 'life') result = result.replace(/\blife\b/gi, '');
    if (category === 'misfit') result = result.replace(/\bmisfit\b/gi, '');
    if (category === 'stop2030barclay') result = result.replace(/\b(barclay|stop\s*2030|stop2030)\b/gi, '');
    if (category === 'cycles') result = result.replace(/\bcycles\b/gi, '');
  }
  if (priority === 'critical') {
    result = result.replace(/\b(critical|urgent|asap|as\s+ap|emergency|rush|top\s+priority)\b/gi, '');
  } else if (priority === 'high') {
    result = result.replace(/\b(high\s+priority|high\s+prio|important|must\s+do|must\s+be)\b/gi, '');
  } else if (priority === 'low') {
    result = result.replace(/\b(low\s+priority|low\s+prio|whenever|nice\s+to\s+have|optional|backlog)\b/gi, '');
  }
  return result.replace(/\s+/g, ' ').trim();
}

/**
 * @param {string} text
 * @param {string} [category]
 * @param {string|null} [deadline]
 * @param {string|null} [priority]
 * @param {'daily'|'weekly'|'monthly'|null} [recurrence]
 * @param {string|null} [reminderAt]
 * @param {string|null} [doingDate]
 * @param {string|null} [pileId]
 * @param {'quick'|'medium'|'deep'|null} [friction]
 * @param {string|null} [personId]
 * @returns {import('../types.js').Task}
 */
function createItem(text, category, deadline, priority, recurrence, reminderAt, doingDate, pileId, friction, personId) {
  const cleanText = stripAutoExtractedFromText(text, category, deadline, priority) || text.trim();
  return {
    id: 'id_' + Date.now() + '_' + Math.random().toString(36).slice(2),
    text: cleanText || text.trim(),
    category: category || state.lastCategory,
    parkedAt: Date.now(),
    deadline: deadline || null,
    doingDate: doingDate || null,
    priority: priority || 'medium',
    recurrence: recurrence || null,
    reminderAt: reminderAt || null,
    archived: false,
    pileId: pileId != null ? pileId : null,
    friction: friction && ['quick', 'medium', 'deep'].includes(friction) ? friction : null,
    firstStep: null,
    personId: personId != null ? personId : null
  };
}

/**
 * @param {number} ms
 * @returns {string}
 */
function formatDuration(ms) {
  const days = Math.floor(ms / 86400000);
  if (days < 1) return 'Today';
  if (days === 1) return '1d';
  if (days < 7) return days + 'd';
  if (days < 30) return Math.floor(days / 7) + 'w';
  if (days < 365) return Math.floor(days / 30) + 'mo';
  return Math.floor(days / 365) + 'y';
}

/**
 * @param {string} iso
 * @returns {Date|null}
 */
function parseLocalDate(iso) {
  if (!iso || typeof iso !== 'string') return null;
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10);
  const d = parseInt(m[3], 10);
  return new Date(y, mo - 1, d);
}

/**
 * @param {import('../types.js').Task} item
 * @returns {Date|null}
 */
function getSortReferenceDate(item) {
  // Doing-by date is the execution target, so it outranks due date for sorting.
  return parseLocalDate(item.doingDate) || parseLocalDate(item.deadline);
}

/**
 * @param {string|null} iso
 * @returns {{ text: string, overdue: boolean }|null}
 */
function formatDeadline(iso) {
  if (!iso) return null;
  const d = parseLocalDate(iso);
  if (!d) return null;
  const today = new Date();
  today.setHours(0,0,0,0);
  const diff = (d - today) / 86400000;
  if (diff < 0) return { text: 'OVERDUE (' + Math.abs(Math.floor(diff)) + 'd)', overdue: true };
  if (diff === 0) return { text: 'Today', overdue: false };
  if (diff <= 7) return { text: 'In ' + Math.floor(diff) + 'd', overdue: false };
  return { text: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), overdue: false };
}

const FRICTION_ORDER = { quick: 0, medium: 1, deep: 2 };

/**
 * @returns {string} YYYY-MM-DD in local calendar
 */
function getTodayLocalYYYYMMDD() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

/**
 * @param {import('../types.js').Task} item
 * @returns {number}
 */
function getTimeBand(item) {
  const d = getSortReferenceDate(item);
  if (!d || isNaN(d.getTime())) return 3;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setDate(todayEnd.getDate() + 1);
  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() + 8);
  if (d < now) return 0;
  if (d < todayEnd) return 1;
  if (d < weekEnd) return 2;
  return 4;
}

/**
 * @param {import('../types.js').Task[]} items
 * @returns {import('../types.js').Task[]}
 */
function sortByTimeBandsAndFriction(items) {
  return [...items].sort((a, b) => {
    const bandA = getTimeBand(a);
    const bandB = getTimeBand(b);
    if (bandA !== bandB) return bandA - bandB;
    const priorityA = PRIORITY_ORDER[a.priority] ?? 2;
    const priorityB = PRIORITY_ORDER[b.priority] ?? 2;
    if (priorityA !== priorityB) return priorityA - priorityB;
    const frictionA = FRICTION_ORDER[a.friction] ?? 1;
    const frictionB = FRICTION_ORDER[b.friction] ?? 1;
    if (frictionA !== frictionB) return frictionA - frictionB;
    const dateA = getSortReferenceDate(a);
    const dateB = getSortReferenceDate(b);
    if (dateA && dateB) return dateA - dateB;
    const pa = a.parkedAt || 0;
    const pb = b.parkedAt || 0;
    if (pa !== pb) return pa - pb;
    return String(a.id).localeCompare(String(b.id));
  });
}

/**
 * @param {import('../types.js').Task[]} items
 * @returns {import('../types.js').Task[]}
 */
function sortItems(items) {
  return sortByTimeBandsAndFriction(items);
}

/**
 * @returns {boolean}
 */
function archivePastDoingDatesIfNeeded() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let changed = false;
  state.items.forEach(i => {
    const doing = parseLocalDate(i.doingDate);
    if (!i.archived && doing && doing < today) {
      i.archived = true;
      i.archivedAt = i.archivedAt || Date.now();
      changed = true;
    }
  });
  if (changed) persist();
  return changed;
}

/**
 * @returns {import('../types.js').Task[]}
 */
function getActiveItems() {
  return state.items.filter(i => !i.archived);
}

/**
 * @param {string} cat
 * @returns {import('../types.js').Task[]}
 */
function getItemsByCategory(cat) {
  let items = getActiveItems().filter(i => i.category === cat);
  const q = (state.searchQuery || '').trim().toLowerCase();
  if (q) items = items.filter(i => (i.text || '').toLowerCase().includes(q));
  return items;
}

/**
 * @param {string} catId
 * @returns {string|null}
 */
function getColumnColor(catId) {
  if (catId === '__button' || catId === '__text') return null;
  return state.columnColors[catId] || DEFAULT_COLUMN_COLORS[catId] || '#6b7280';
}

/**
 * @returns {Record<string, string>}
 */
function getActiveColumnColors() {
  const out = {};
  Object.keys(state.columnColors || {}).forEach(k => {
    if (k !== '__button' && k !== '__text') out[k] = state.columnColors[k];
  });
  return out;
}

export {
  detectCategory,
  extractDeadline,
  extractDoingDate,
  extractFriction,
  extractRecurrence,
  extractPriority,
  stripAutoExtractedFromText,
  createItem,
  formatDuration,
  parseLocalDate,
  getSortReferenceDate,
  formatDeadline,
  getTodayLocalYYYYMMDD,
  getTimeBand,
  sortByTimeBandsAndFriction,
  sortItems,
  archivePastDoingDatesIfNeeded,
  getActiveItems,
  getItemsByCategory,
  getColumnColor,
  getActiveColumnColors
};
