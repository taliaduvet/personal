export const state = {
  items: [],
  todaySuggestionIds: [],
  completedTodayCount: 0,
  lastCompletedDate: null,
  lastCategory: 'life',
  drillDownCategory: null,
  selectedIds: new Set(),
  searchQuery: '',
  undoItem: null,
  undoTimeout: null,
  editingId: null,
  pairId: null,
  addedBy: null,
  deviceSyncId: null,
  talkAboutItems: [],
  talkAboutUnsubscribe: null,
  prefsUnsubscribe: null,
  customLabels: {},
  columnColors: {},
  columnOrder: null,
  categoryPreset: 'generic',
  buttonColor: null,
  textColor: null,
  displayName: '',
  emailTriageItems: [],
  lastAgentRun: null,
  emailTriageUnsubscribe: null,
  savePrefsTimeout: null,
  processingIds: new Set(),
  expandingMetaCardId: null,
  addFromTalkItem: null,
  tallyResetHour: 3,
  piles: [],
  viewMode: 'columns',
  showSuggestNext: false,
  suggestNextStripTimeout: null,
  columnNotes: {},
  openColumnNoteId: null,
  columnNoteSaveTimeouts: {},
  lastSeed: null,
  seedRenderTaskCache: [],
  seedRenderState: null,
  seedReflections: [],
  habits: [],
  habitCompletions: [],
  journalDaily: {},
  /** Which entry id is open per YYYY-MM-DD tally day (daily tab). */
  journalDailyOpenEntryByDate: {},
  journalActiveTab: 'daily',
  journalFocusMode: false,
  /** Board view: ◎ FAB hides Today strip + columns, shows #focus-mode only (not persisted). */
  boardFocusMode: false,
  journalDailySaveTimeout: null,
  people: [],
  /** @type {{ id: string, label: string }[] | null} */
  peopleGroups: null,
  relationshipsDetailPersonId: null,
  /** Shown in Settings; set from `product.json` (no private URLs). */
  buildRef: '',
  /** Optional white-label copy from `product.json`. */
  productConfig: null,
  /** @type {{ anchorWeekStart: string | null, days: Record<string, { pileId: string | null, orderedTaskIds: string[] }> }} */
  weekPlan: { anchorWeekStart: null, days: {} },
  /** ISO timestamp of last planning session Done. */
  lastPlanCommittedAt: null,
  /** Deep copy of weekPlan at last Done; powers pre-plan review. */
  lastCommittedPlanSnapshot: null,
  /** After calendar week rollover, read-only prior week for overlay "Last week" block. */
  previousWeekPlanSnapshot: null,
  /** Main page: show compact week row (off by default). */
  showWeekStrip: false,
  /** YYYY-MM-DD — if set to today, "Other" loads collapsed (first open of day = expanded). */
  otherCollapsedOnDate: null,
  /** Per calendar day: task ids explicitly removed from Today (not done) — hides pile/dated rows still in the plan. */
  hiddenFromTodayByDate: {}
};
