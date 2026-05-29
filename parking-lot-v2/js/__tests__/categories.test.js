import { describe, it, expect, beforeEach } from 'vitest';
import { state } from '../state.js';
import {
  coerceCategoryId,
  getValidCategoryIds,
  getCategoryLabel,
  getCategoryOptionLabel,
  resetUniformCustomColumnNames,
  sanitizeCategoriesAndItemsAfterLoad
} from '../domain/categories.js';

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

describe('getCategoryOptionLabel', () => {
  beforeEach(() => {
    state.categoryPreset = 'generic';
    state.customLabels = {};
  });

  it('matches preset labels when no duplicates', () => {
    expect(getCategoryOptionLabel('work')).toBe('Work');
  });

  it('appends id when several columns share the same display string', () => {
    state.customLabels = {
      work: 'Same',
      hobbies: 'Same',
      life: 'Same',
      other: 'Same'
    };
    expect(getCategoryLabel('work')).toBe('Same');
    expect(getCategoryOptionLabel('work')).toBe('Same (work)');
    expect(getCategoryOptionLabel('hobbies')).toBe('Same (hobbies)');
  });
});

describe('resetUniformCustomColumnNames', () => {
  beforeEach(() => {
    state.categoryPreset = 'generic';
    state.customLabels = {};
  });

  it('clears when all four custom names are identical', () => {
    state.customLabels = { work: 'X', hobbies: 'X', life: 'X', other: 'X' };
    expect(resetUniformCustomColumnNames()).toBe(true);
    expect(state.customLabels).toEqual({});
  });

  it('does not clear when any column is unset', () => {
    state.customLabels = { work: 'X', hobbies: 'X', life: 'X' };
    expect(resetUniformCustomColumnNames()).toBe(false);
    expect(state.customLabels.life).toBe('X');
  });

  it('sanitize persists uniform reset via return flag', () => {
    state.customLabels = { work: 'Dup', hobbies: 'Dup', life: 'Dup', other: 'Dup' };
    const meta = sanitizeCategoriesAndItemsAfterLoad();
    expect(meta.clearedUniformCustomLabels).toBe(true);
    expect(state.customLabels).toEqual({});
  });
});
