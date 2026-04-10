/** Contract for Settings → Export backup JSON (importers may add fields over time). */
export const BACKUP_EXPORT_VERSION = 1;

export function buildBackupPayload(state) {
  return {
    backupVersion: BACKUP_EXPORT_VERSION,
    items: state.items,
    todaySuggestionIds: state.todaySuggestionIds,
    weekPlan: state.weekPlan || { anchorWeekStart: null, days: {} },
    lastPlanCommittedAt: state.lastPlanCommittedAt ?? null,
    lastCommittedPlanSnapshot: state.lastCommittedPlanSnapshot ?? null,
    previousWeekPlanSnapshot: state.previousWeekPlanSnapshot ?? null,
    showWeekStrip: !!state.showWeekStrip,
    otherCollapsedOnDate: state.otherCollapsedOnDate ?? null,
    exportedAt: new Date().toISOString(),
  };
}
