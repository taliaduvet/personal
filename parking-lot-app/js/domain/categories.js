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
