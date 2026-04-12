/**
 * JSDoc-only module — no runtime exports. Import typedefs via `import('./types.js')` in @type tags.
 */

/**
 * @typedef {Object} Task
 * @property {string} id
 * @property {string} text
 * @property {string} category
 * @property {number} [parkedAt]
 * @property {string|null} deadline - YYYY-MM-DD
 * @property {string|null} doingDate - YYYY-MM-DD
 * @property {'critical'|'high'|'medium'|'low'|null} [priority]
 * @property {'daily'|'weekly'|'monthly'|null} [recurrence]
 * @property {string|null} [reminderAt]
 * @property {string|null} [pileId]
 * @property {'quick'|'medium'|'deep'|null} [friction]
 * @property {string|null} [firstStep]
 * @property {string|null} [personId]
 * @property {boolean} [archived]
 * @property {number|null} [archivedAt]
 * @property {number|null} [completedAt]
 */

/**
 * @typedef {Object} Habit
 * @property {string} id
 * @property {string} name
 * @property {number} weight - 1 to 5
 * @property {string|null} linkedCategoryId
 * @property {string|null} linkedPileId
 */

/**
 * @typedef {Object} HabitCompletion
 * @property {string} habitId
 * @property {string} date - YYYY-MM-DD
 * @property {'manual'|'task'} source
 * @property {string|null} [taskId]
 */

/**
 * @typedef {Object} Person
 * @property {string} id
 * @property {string} name
 * @property {string} group
 * @property {string|null} lastConnected - YYYY-MM-DD
 * @property {{ interval: string }|null} [reconnectRule]
 * @property {string|null} [notes]
 * @property {{ at: number, text: string }[]} [history]
 */

/**
 * @typedef {Object} Pile
 * @property {string} id
 * @property {string} name
 * @property {number} [order]
 */

/**
 * @typedef {Object} JournalDayV2
 * @property {2} v
 * @property {{ id: string, html: string, updatedAt: number }[]} entries
 */

/**
 * @typedef {Object} WeekPlanState
 * @property {string|null} anchorWeekStart
 * @property {Record<string, { pileId: string|null, orderedTaskIds: string[] }>} days
 */

/**
 * @typedef {Object} AppState
 * @property {Task[]} items
 * @property {string[]} todaySuggestionIds
 * @property {number} completedTodayCount
 * @property {string|null} lastCompletedDate
 * @property {string} lastCategory
 * @property {string|null} drillDownCategory
 * @property {Set<string>} selectedIds
 * @property {string} searchQuery
 * @property {Task|null} undoItem
 * @property {ReturnType<typeof setTimeout>|null} undoTimeout
 * @property {string|null} editingId
 * @property {string|null} pairId
 * @property {string|null} addedBy
 * @property {string|null} deviceSyncId
 * @property {unknown[]} talkAboutItems
 * @property {(() => void)|null} talkAboutUnsubscribe
 * @property {(() => void)|null} prefsUnsubscribe
 * @property {Record<string, string>} customLabels
 * @property {Record<string, string>} columnColors
 * @property {string[]|null} columnOrder
 * @property {string} categoryPreset
 * @property {string|null} buttonColor
 * @property {string|null} textColor
 * @property {string} displayName
 * @property {unknown[]} emailTriageItems
 * @property {unknown|null} lastAgentRun
 * @property {(() => void)|null} emailTriageUnsubscribe
 * @property {ReturnType<typeof setTimeout>|null} savePrefsTimeout
 * @property {Set<string>} processingIds
 * @property {string|null} expandingMetaCardId
 * @property {unknown|null} addFromTalkItem
 * @property {number} tallyResetHour
 * @property {Pile[]} piles
 * @property {'columns'|'piles'} viewMode
 * @property {boolean} showSuggestNext
 * @property {ReturnType<typeof setTimeout>|null} suggestNextStripTimeout
 * @property {Record<string, string>} columnNotes
 * @property {string|null} openColumnNoteId
 * @property {Record<string, ReturnType<typeof setTimeout>>} columnNoteSaveTimeouts
 * @property {string|null} lastSeed
 * @property {unknown[]} seedRenderTaskCache
 * @property {unknown|null} seedRenderState
 * @property {unknown[]} seedReflections
 * @property {Habit[]} habits
 * @property {HabitCompletion[]} habitCompletions
 * @property {Record<string, JournalDayV2|string>} journalDaily
 * @property {Record<string, string>} journalDailyOpenEntryByDate
 * @property {'daily'|'reflections'} journalActiveTab
 * @property {boolean} journalFocusMode
 * @property {boolean} boardFocusMode
 * @property {ReturnType<typeof setTimeout>|null} journalDailySaveTimeout
 * @property {Person[]} people
 * @property {{ id: string, label: string }[]|null} peopleGroups
 * @property {string|null} relationshipsDetailPersonId
 * @property {string} buildRef
 * @property {Record<string, unknown>|null} productConfig
 * @property {WeekPlanState} weekPlan
 * @property {string|null} lastPlanCommittedAt
 * @property {WeekPlanState|null} lastCommittedPlanSnapshot
 * @property {WeekPlanState|null} previousWeekPlanSnapshot
 * @property {boolean} showWeekStrip
 * @property {string|null} otherCollapsedOnDate
 * @property {Record<string, string[]>} hiddenFromTodayByDate
 * @property {ReturnType<typeof setTimeout>|null} [undoDoneTimeout]
 */
