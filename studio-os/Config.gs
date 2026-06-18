/**
 * Studio OS — central configuration.
 *
 * This file is the single source of truth for the entire theme and schema.
 * Re-skin the whole system by editing COLORS; change the layout by editing
 * LAYOUT. Nothing else in the codebase hardcodes a hex value or a column index.
 *
 * IMPORTANT FOR THE PHASE 2 APP:
 * The React app reads/writes this same Sheet. Column order, tab names, and the
 * Calendar event-ID format defined here are a contract the app depends on.
 * Do not reorder columns or rename tabs without updating the app.
 */

/* ------------------------------------------------------------------ *
 * Tab names
 * ------------------------------------------------------------------ */
const TAB = {
  DASHBOARD: 'Dashboard',
  TASKS: 'Tasks',
  GOALS: 'Goals',
  PROJECTS: 'Projects',
  WEEKLY: 'Weekly Review',
  SETTINGS: '_Settings', // hidden key/value store the app reads
};

// Order tabs are created/displayed in.
const TAB_ORDER = [TAB.DASHBOARD, TAB.TASKS, TAB.GOALS, TAB.PROJECTS, TAB.WEEKLY, TAB.SETTINGS];

/* ------------------------------------------------------------------ *
 * Color system — edit here to re-skin the entire product
 * ------------------------------------------------------------------ */
const COLORS = {
  accent: '#5B61E8',

  // Text
  textPrimary: '#181C22',
  textSecondary: '#8B95A1',
  headerText: '#9AA4B0',

  // Surfaces & lines
  white: '#FFFFFF',
  zebra: '#FBFCFD',
  rowSeparator: '#EEF2F5',
  headerBorder: '#D9DEE3',
  cardBorder: '#E6EBEF',
  tint: '#EEEFFB', // soft accent fill (reflection / in-progress)

  // Category — drives conditional formatting on Tasks column B
  category: {
    Grant:   { bg: '#EFEAFB', fg: '#6A5DC0' },
    Release: { bg: '#E2F1E8', fg: '#3C8262' },
    Touring: { bg: '#E5EEF6', fg: '#3D6F9F' },
    Promo:   { bg: '#FBEADF', fg: '#BC6740' },
    Admin:   { bg: '#ECEFF2', fg: '#69737E' },
  },

  // Priority — drives conditional formatting on Tasks column D
  priority: {
    High: { bg: '#F7E9E5', fg: '#B0412B' },
    Med:  { bg: '#F6EFE0', fg: '#B0883C' },
    Low:  { bg: '#F0EFEC', fg: '#A39E95' },
  },

  // Status — drives conditional formatting on Tasks column H
  status: {
    'Done':        { bg: '#E2F1E8', fg: '#3C8262' },
    'In progress': { bg: '#EEEFFB', fg: '#5B61E8' },
    'To do':       { bg: '#F1F3F5', fg: '#5C6672' },
    'Not started': { bg: '#F1F3F5', fg: '#9AA4B0' },
  },

  // Deadline urgency — Tasks column E, within 3 days and not Done
  deadlineUrgent: '#BB4A2E',
};

const FONT = 'Lexend';

/* ------------------------------------------------------------------ *
 * Dropdown option lists (also used to seed validation)
 * ------------------------------------------------------------------ */
const OPTIONS = {
  category: ['Grant', 'Release', 'Touring', 'Promo', 'Admin'],
  priority: ['High', 'Med', 'Low'],
  doingDay: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  status: ['Not started', 'To do', 'In progress', 'Done'],
  projectStatus: ['Active', 'On hold', 'Done'],
  goalType: ['percent', 'currency', 'count', 'binary'],
  goalMode: ['manual', 'auto-count'],
};

/* ------------------------------------------------------------------ *
 * TASKS schema — columns A..O (1-indexed)
 * Columns L..O are hidden; the app uses them, the Sheet ignores them.
 * ------------------------------------------------------------------ */
const TASKS = {
  HEADERS: [
    'Task', 'Category', 'Project', 'Priority', 'Hard Deadline', 'Target Week',
    'Doing Day', 'Status', 'Notes', 'Drive Link', 'Goal',
    'Calendar Event ID', 'Task ID', 'Created At', 'Completed At',
  ],
  COL: {
    TASK: 1, CATEGORY: 2, PROJECT: 3, PRIORITY: 4, DEADLINE: 5, TARGET_WEEK: 6,
    DOING_DAY: 7, STATUS: 8, NOTES: 9, DRIVE: 10, GOAL: 11,
    EVENT_ID: 12, TASK_ID: 13, CREATED_AT: 14, COMPLETED_AT: 15,
  },
  // Visible widths; hidden columns get width 0 via HIDDEN list.
  WIDTHS: { 1: 280, 2: 110, 3: 130, 4: 90, 5: 110, 6: 110, 7: 90, 8: 120, 9: 240, 10: 90, 11: 120 },
  HIDDEN: [12, 13, 14, 15],
  HEADER_ROW: 1,
  FIRST_DATA_ROW: 2,
  ROW_HEIGHT: 34,
  HEADER_HEIGHT: 30,
};

/* ------------------------------------------------------------------ *
 * GOALS schema — columns A..I
 * ------------------------------------------------------------------ */
const GOALS = {
  HEADERS: ['Goal', 'Detail', 'Target', 'Current', 'Progress', 'Progress Bar', 'Type', 'Progress Mode', 'Goal ID'],
  COL: {
    GOAL: 1, DETAIL: 2, TARGET: 3, CURRENT: 4, PROGRESS: 5, BAR: 6, TYPE: 7, MODE: 8, GOAL_ID: 9,
  },
  WIDTHS: { 1: 220, 2: 240, 3: 90, 4: 90, 5: 90, 6: 140, 7: 100, 8: 120 },
  HIDDEN: [9],
  HEADER_ROW: 1,
  FIRST_DATA_ROW: 2,
  ROW_HEIGHT: 34,
  HEADER_HEIGHT: 30,
};

/* ------------------------------------------------------------------ *
 * PROJECTS schema — columns A..G
 * ------------------------------------------------------------------ */
const PROJECTS = {
  HEADERS: ['Project', 'Detail', 'Status', 'Target Date', 'Color', 'Goal', 'Project ID'],
  COL: {
    PROJECT: 1, DETAIL: 2, STATUS: 3, TARGET_DATE: 4, COLOR: 5, GOAL: 6, PROJECT_ID: 7,
  },
  WIDTHS: { 1: 200, 2: 280, 3: 110, 4: 120, 5: 110, 6: 180 },
  HIDDEN: [7],
  HEADER_ROW: 1,
  FIRST_DATA_ROW: 2,
  ROW_HEIGHT: 34,
  HEADER_HEIGHT: 30,
};

/* ------------------------------------------------------------------ *
 * Settings keys + defaults (stored in the hidden _Settings tab as key/value)
 * The Phase 2 app reads accentColor, userName, density, weeklyReview*,
 * timezone, calendarSyncMode, calendarId, sheetId, schemaVersion from here.
 * ------------------------------------------------------------------ */
const SCHEMA_VERSION = '1.0.0';

const SETTINGS_DEFAULTS = [
  ['userName', 'Talia'],
  ['accentColor', COLORS.accent],
  ['density', 'Comfortable'],
  ['weeklyReviewDay', 'Mon'],
  ['weeklyReviewTime', '09:00'],
  ['timezone', ''], // populated at build time from the spreadsheet timezone
  ['calendarSyncMode', 'appsScript'], // appsScript | app | off
  ['calendarName', 'Studio OS'],
  ['calendarId', ''], // populated on first calendar sync
  ['sheetId', ''], // populated at build time
  ['schemaVersion', SCHEMA_VERSION],
];

/* ------------------------------------------------------------------ *
 * Calendar event-ID format stored in Tasks column L (EVENT_ID).
 *
 *   deadline:EVENT_ID|doing:EVENT_ID
 *
 * Either part may be absent. Examples:
 *   "deadline:abc123"                  -> only a hard-deadline event
 *   "doing:def456"                     -> only a doing-day event
 *   "deadline:abc123|doing:def456"     -> both
 *
 * Phase 2: the app takes over writing this column via the Calendar API,
 * keeping the exact same format so existing rows remain valid.
 * ------------------------------------------------------------------ */
const EVENT_TAG = { DEADLINE: 'deadline', DOING: 'doing' };

/* ------------------------------------------------------------------ *
 * Shared helpers
 * ------------------------------------------------------------------ */

/** Get a sheet by name, creating it if missing. */
function getOrCreateSheet_(ss, name) {
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  return sh;
}

/** Generate a stable unique id (used for Task/Goal/Project IDs). */
function newId_() {
  return Utilities.getUuid();
}

/** The active spreadsheet's timezone string, e.g. "America/Vancouver". */
function tz_() {
  return SpreadsheetApp.getActive().getSpreadsheetTimeZone();
}

/** A1-style column letter from a 1-indexed column number. */
function colLetter_(col) {
  let s = '';
  while (col > 0) {
    const m = (col - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    col = Math.floor((col - 1) / 26);
  }
  return s;
}

/**
 * Apply the calm, app-like base style to a sheet:
 * hidden gridlines, Lexend font, primary text color, vertical centering.
 */
function applyBaseSheetStyle_(sheet) {
  sheet.setHiddenGridlines(true);
  const maxRows = sheet.getMaxRows();
  const maxCols = sheet.getMaxColumns();
  const all = sheet.getRange(1, 1, maxRows, maxCols);
  all.setFontFamily(FONT)
     .setFontColor(COLORS.textPrimary)
     .setVerticalAlignment('middle')
     .setHorizontalAlignment('left');
}

/**
 * Style a header row: white fill, muted uppercase labels, thin bottom border.
 * `range` is the header row range (row 1, all data columns).
 */
function styleHeaderRow_(sheet, range, headerHeight) {
  range.setBackground(COLORS.white)
       .setFontColor(COLORS.headerText)
       .setFontWeight('bold')
       .setFontSize(9)
       .setVerticalAlignment('middle')
       .setBorder(false, false, true, false, false, false, COLORS.headerBorder, SpreadsheetApp.BorderStyle.SOLID);
  sheet.setRowHeight(range.getRow(), headerHeight);
}

/** Uppercase a list of header labels (Sheets has no text-transform). */
function upper_(arr) {
  return arr.map(function (h) { return String(h).toUpperCase(); });
}

/** Clear a sheet completely (values, formats, validations, conditional rules, merges). */
function resetSheet_(sheet) {
  sheet.clear();
  sheet.clearConditionalFormatRules();
  const merges = sheet.getRange(1, 1, sheet.getMaxRows(), sheet.getMaxColumns()).getMergedRanges();
  merges.forEach(function (m) { m.breakApart(); });
  // Remove any leftover data validations.
  sheet.getRange(1, 1, sheet.getMaxRows(), sheet.getMaxColumns()).clearDataValidations();
}

/** Build a data-validation rule from a list, optionally allowing free entry. */
function listRule_(values, allowInvalid) {
  return SpreadsheetApp.newDataValidation()
    .requireValueInList(values, true)
    .setAllowInvalid(!!allowInvalid)
    .build();
}
