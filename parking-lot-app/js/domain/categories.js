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
 */
export function sanitizeCategoriesAndItemsAfterLoad() {
  pruneCustomLabelsForCurrentPreset();
  state.lastCategory = coerceCategoryId(state.lastCategory);
  (state.items || []).forEach(item => {
    const c = coerceCategoryId(item.category);
    if (c !== item.category) item.category = c;
  });
}
