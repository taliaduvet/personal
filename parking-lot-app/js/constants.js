export const CATEGORY_PRESETS = {
  generic: [
    { id: 'work', label: 'Work' },
    { id: 'hobbies', label: 'Hobbies' },
    { id: 'life', label: 'Life' },
    { id: 'other', label: 'Other' }
  ],
  creative: [
    { id: 'misfit', label: 'Misfit' },
    { id: 'stop2030barclay', label: 'Stop 2030 Barclay' },
    { id: 'cycles', label: 'Cycles' },
    { id: 'life', label: 'Life' }
  ]
};

export const PRESET_MIGRATION = {
  generic_to_creative: { work: 'misfit', hobbies: 'stop2030barclay', life: 'life', other: 'cycles' },
  creative_to_generic: { misfit: 'work', stop2030barclay: 'hobbies', life: 'life', cycles: 'other' }
};

export const PRIORITIES = ['critical', 'high', 'medium', 'low'];
export const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };
export const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };

export const STORAGE_PREFIX = 'parkingLotCouples_';
export const HAS_CHOSEN_SOLO_KEY = STORAGE_PREFIX + 'hasChosenSolo';

export const DEFAULT_COLUMN_COLORS = {
  work: '#e07a5f',
  hobbies: '#81b29a',
  life: '#f2cc8f',
  other: '#9ca3af',
  misfit: '#e07a5f',
  stop2030barclay: '#81b29a',
  cycles: '#f2cc8f'
};
