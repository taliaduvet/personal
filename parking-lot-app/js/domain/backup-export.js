/** Contract for Settings → Export backup JSON (importers may add fields over time). */
export const BACKUP_EXPORT_VERSION = 1;

export function buildBackupPayload(state) {
  return {
    backupVersion: BACKUP_EXPORT_VERSION,
    items: state.items,
    todaySuggestionIds: state.todaySuggestionIds,
    exportedAt: new Date().toISOString(),
  };
}
