import { describe, it, expect, beforeEach } from 'vitest';
import { state } from '../state.js';
import { coerceCategoryId, getValidCategoryIds } from '../domain/categories.js';

describe('domain/categories coerceCategoryId', () => {
  beforeEach(() => {
    state.categoryPreset = 'generic';
    state.customLabels = {};
  });

  it('keeps valid ids for generic preset', () => {
    expect(coerceCategoryId('work')).toBe('work');
    expect(coerceCategoryId('life')).toBe('life');
  });

  it('maps stale creative ids to default when preset is generic', () => {
    expect(coerceCategoryId('misfit')).toBe('life');
    expect(coerceCategoryId('not-a-real-id')).toBe('life');
  });

  it('maps ids for creative preset', () => {
    state.categoryPreset = 'creative';
    expect(coerceCategoryId('misfit')).toBe('misfit');
    expect(coerceCategoryId('work')).toBe('life');
    expect(getValidCategoryIds().length).toBe(4);
  });
});
