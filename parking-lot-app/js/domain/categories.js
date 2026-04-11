import { CATEGORY_PRESETS } from '../constants.js';
import { state } from '../state.js';

export function getCategories() {
  const preset = state.categoryPreset || 'generic';
  return CATEGORY_PRESETS[preset] || CATEGORY_PRESETS.generic;
}

export function getOrderedCategoryIds() {
  const baseIds = getCategories().map(c => c.id);
  if (state.columnOrder && state.columnOrder.length) {
    const order = state.columnOrder.filter(id => baseIds.includes(id));
    const rest = baseIds.filter(id => !order.includes(id));
    return [...order, ...rest];
  }
  return baseIds;
}

export function getCategoryLabel(catId) {
  if (state.customLabels[catId]) return state.customLabels[catId];
  const cat = getCategories().find(c => c.id === catId);
  return cat ? cat.label : catId;
}

/**
 * For selects and headers: if several columns share the same display string (e.g. accidental
 * duplicate custom names), append the id so choices stay distinguishable.
 */
export function getCategoryOptionLabel(catId) {
  const display = getCategoryLabel(catId);
  const ids = getValidCategoryIds();
  const n = ids.filter(id => getCategoryLabel(id) === display).length;
  if (n > 1) return `${display} (${catId})`;
  return display;
}

/**
 * If every life-area column has the same custom label text, clear them (usually a mistaken paste).
 * @returns {boolean} true if custom labels were cleared
 */
export function resetUniformCustomColumnNames() {
  if (!state.customLabels || typeof state.customLabels !== 'object') return false;
  const ids = getValidCategoryIds();
  const vals = ids.map(id => state.customLabels[id]);
  if (vals.some(v => v == null || String(v).trim() === '')) return false;
  const first = String(vals[0]).trim();
  if (vals.every(v => String(v).trim() === first)) {
    ids.forEach(id => delete state.customLabels[id]);
    return true;
  }
  return false;
}

/** Ids for the active preset (e.g. work, hobbies, life, other). */
export function getValidCategoryIds() {
  return getCategories().map(c => c.id);
}

/** Default life-area column when coercing invalid ids (matches historical default). */
export function getDefaultCategoryId() {
  const ids = getValidCategoryIds();
  if (ids.includes('life')) return 'life';
  return ids[0] || 'life';
}

/**
 * Map any stored value to a valid category id for the current preset.
 * Fixes stale ids after preset switches, mistaken pile UUIDs passed as category, etc.
 */
export function coerceCategoryId(raw) {
  if (raw == null || raw === '') return getDefaultCategoryId();
  const ids = getValidCategoryIds();
  if (ids.includes(raw)) return raw;
  return getDefaultCategoryId();
}

/** Drop custom column names that no longer apply to the current preset. */
export function pruneCustomLabelsForCurrentPreset() {
  const ids = new Set(getValidCategoryIds());
  if (!state.customLabels || typeof state.customLabels !== 'object') state.customLabels = {};
  Object.keys(state.customLabels).forEach(k => {
    if (!ids.has(k)) delete state.customLabels[k];
  });
}

/**
 * After load or remote prefs: fix lastCategory, item.category, and orphan custom labels.
 * @returns {{ clearedUniformCustomLabels: boolean }}
 */
export function sanitizeCategoriesAndItemsAfterLoad() {
  pruneCustomLabelsForCurrentPreset();
  const clearedUniformCustomLabels = resetUniformCustomColumnNames();
  state.lastCategory = coerceCategoryId(state.lastCategory);
  (state.items || []).forEach(item => {
    const c = coerceCategoryId(item.category);
    if (c !== item.category) item.category = c;
  });
  return { clearedUniformCustomLabels };
}
