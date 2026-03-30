import { describe, expect, it } from 'vitest';

import { BACKUP_EXPORT_VERSION, buildBackupPayload } from '../domain/backup-export.js';

describe('backup-export contract', () => {
  it('export has stable top-level keys for importers', () => {
    const state = {
      items: [{ id: 'id_1', text: 'hello', category: 'life', archived: false, parkedAt: 1 }],
      todaySuggestionIds: ['id_1'],
    };
    const data = buildBackupPayload(state);
    expect(Object.keys(data).sort()).toEqual(
      ['backupVersion', 'exportedAt', 'items', 'todaySuggestionIds'].sort()
    );
    expect(data.backupVersion).toBe(BACKUP_EXPORT_VERSION);
    expect(Array.isArray(data.items)).toBe(true);
    expect(Array.isArray(data.todaySuggestionIds)).toBe(true);
    expect(typeof data.exportedAt).toBe('string');
  });
});
