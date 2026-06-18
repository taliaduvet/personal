/**
 * scout_test.js — local validation harness for Studio OS (Apps Script).
 *
 * Apps Script can't run headlessly, but its *pure* logic and its config
 * contract can. This loads the real .gs source into a sandbox with minimal
 * Apps Script mocks and asserts on the bits that don't need a live Sheet.
 *
 * Run: node scout_test.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

/* ---- Minimal Apps Script mocks (only what pure helpers touch) ---- */
const sandbox = {
  console,
  Utilities: { getUuid: () => crypto.randomUUID() },
  Session: { getScriptTimeZone: () => 'America/Vancouver' },
  SpreadsheetApp: {
    getActive: () => ({ getSpreadsheetTimeZone: () => 'America/Vancouver' }),
    BorderStyle: { SOLID: 'SOLID' },
    newDataValidation: () => {
      const api = {};
      ['requireValueInList', 'requireValueInRange', 'setAllowInvalid', 'build']
        .forEach((m) => (api[m] = () => api));
      return api;
    },
  },
  CalendarApp: {
    Weekday: {
      SUNDAY: 'SUN', MONDAY: 'MON', TUESDAY: 'TUE', WEDNESDAY: 'WED',
      THURSDAY: 'THU', FRIDAY: 'FRI', SATURDAY: 'SAT',
    },
    Color: { INDIGO: 'INDIGO' },
  },
};
vm.createContext(sandbox);

/* ---- Load the real source into the sandbox ----
 * Concatenate into a single script so top-level `const` bindings stay in one
 * lexical scope, then export the names we test (const/let don't attach to the
 * vm global the way `var`/function declarations do). */
const dir = __dirname;
const combined = ['Config.gs', 'CalendarSync.gs', 'SampleData.gs']
  .map((f) => fs.readFileSync(path.join(dir, f), 'utf8'))
  .join('\n');
const exportNames = [
  'TAB', 'TAB_ORDER', 'TASKS', 'GOALS', 'PROJECTS', 'SETTINGS_DEFAULTS',
  'colLetter_', 'upper_', 'parseEventIds_', 'buildEventIds_', 'weekdayEnum_',
  'nextWeekdayAt_', 'thisMonday_', 'addDays_', 'newId_',
];
const exporter = `\nglobalThis.__exports = { ${exportNames.join(', ')} };`;
vm.runInContext(combined + exporter, sandbox, { filename: 'studio-os-combined' });
Object.assign(sandbox, sandbox.__exports);

/* ---- Tiny assertion runner ---- */
let pass = 0, fail = 0;
const fails = [];
function eq(actual, expected, msg) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { pass++; }
  else { fail++; fails.push(`${msg}\n     expected ${e}\n     got      ${a}`); }
}
function ok(cond, msg) {
  if (cond) { pass++; } else { fail++; fails.push(msg); }
}

const S = sandbox;

/* ================= CONFIG INTEGRITY ================= */
// Header count == COL count == max COL index, for each tab.
function checkTab(name, schema) {
  const cols = Object.values(schema.COL);
  eq(schema.HEADERS.length, cols.length, `${name}: HEADERS vs COL count`);
  eq(Math.max.apply(null, cols), schema.HEADERS.length, `${name}: max COL index == #headers`);
  eq(Math.min.apply(null, cols), 1, `${name}: COL is 1-indexed`);
  // No duplicate column indexes
  eq(new Set(cols).size, cols.length, `${name}: COL indexes unique`);
  // Hidden columns are within range
  (schema.HIDDEN || []).forEach((c) =>
    ok(c >= 1 && c <= schema.HEADERS.length, `${name}: HIDDEN col ${c} in range`));
  // Width keys within range
  Object.keys(schema.WIDTHS || {}).forEach((c) =>
    ok(Number(c) >= 1 && Number(c) <= schema.HEADERS.length, `${name}: WIDTH col ${c} in range`));
}
checkTab('TASKS', S.TASKS);
checkTab('GOALS', S.GOALS);
checkTab('PROJECTS', S.PROJECTS);

// Blueprint-locked shapes
eq(S.TASKS.HEADERS.length, 15, 'TASKS has 15 columns (A..O)');
eq(S.GOALS.HEADERS.length, 9, 'GOALS has 9 columns (A..I)');
eq(S.PROJECTS.HEADERS.length, 7, 'PROJECTS has 7 columns (A..G)');
eq(S.TASKS.HIDDEN, [12, 13, 14, 15], 'TASKS hides L,M,N,O');
eq(S.TASKS.COL.EVENT_ID, 12, 'EVENT_ID is col L (12)');
eq(S.TASKS.COL.TASK_ID, 13, 'TASK_ID is col M (13)');

// Settings keys match the blueprint contract
const settingKeys = S.SETTINGS_DEFAULTS.map((p) => p[0]);
['userName', 'accentColor', 'density', 'weeklyReviewDay', 'weeklyReviewTime',
 'timezone', 'calendarSyncMode', 'calendarId', 'sheetId', 'schemaVersion']
  .forEach((k) => ok(settingKeys.includes(k), `Settings includes "${k}"`));

// Tab order has no duplicates and includes all named tabs
eq(new Set(S.TAB_ORDER).size, S.TAB_ORDER.length, 'TAB_ORDER unique');
eq(S.TAB_ORDER.length, Object.keys(S.TAB).length, 'TAB_ORDER covers every tab');

/* ================= PURE LOGIC ================= */
// colLetter_
eq(S.colLetter_(1), 'A', 'colLetter_(1)=A');
eq(S.colLetter_(20), 'T', 'colLetter_(20)=T (dash cfg col)');
eq(S.colLetter_(26), 'Z', 'colLetter_(26)=Z');
eq(S.colLetter_(27), 'AA', 'colLetter_(27)=AA');

// upper_
eq(S.upper_(['Goal', 'Detail']), ['GOAL', 'DETAIL'], 'upper_ uppercases');

// Calendar event-ID round trip (the Phase 2 contract)
eq(S.parseEventIds_('deadline:abc|doing:def'), { deadline: 'abc', doing: 'def' }, 'parse both');
eq(S.parseEventIds_('deadline:abc'), { deadline: 'abc', doing: null }, 'parse deadline only');
eq(S.parseEventIds_('doing:def'), { deadline: null, doing: 'def' }, 'parse doing only');
eq(S.parseEventIds_(''), { deadline: null, doing: null }, 'parse empty');
eq(S.buildEventIds_({ deadline: 'abc', doing: 'def' }), 'deadline:abc|doing:def', 'build both');
eq(S.buildEventIds_({ deadline: 'abc', doing: null }), 'deadline:abc', 'build deadline only');
eq(S.buildEventIds_({ deadline: null, doing: null }), '', 'build empty');
// round-trip with an id that contains a colon (event ids can be weird)
const weird = { deadline: 'a:b@google.com', doing: null };
eq(S.parseEventIds_(S.buildEventIds_(weird)), weird, 'round-trip id containing colon');

// weekdayEnum_
eq(S.weekdayEnum_('Mon'), 'MON', 'weekdayEnum_ Mon');
eq(S.weekdayEnum_('Sun'), 'SUN', 'weekdayEnum_ Sun');
eq(S.weekdayEnum_('???'), 'MON', 'weekdayEnum_ unknown falls back to Mon');

// nextWeekdayAt_ returns a Date that is today-or-future and matches the weekday
const WD = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
Object.keys(WD).forEach((d) => {
  const r = S.nextWeekdayAt_(d, 9, 0);
  ok(Object.prototype.toString.call(r) === '[object Date]', `nextWeekdayAt_(${d}) returns Date`);
  eq(r.getDay(), WD[d], `nextWeekdayAt_(${d}) lands on correct weekday`);
  eq([r.getHours(), r.getMinutes()], [9, 0], `nextWeekdayAt_(${d}) at 09:00`);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  ok(r >= today, `nextWeekdayAt_(${d}) is today or later`);
});

// thisMonday_ is always a Monday, addDays_ math
const mon = S.thisMonday_();
eq(mon.getDay(), 1, 'thisMonday_ is a Monday');
eq(S.addDays_(mon, 7).getDay(), 1, 'addDays_(+7) still Monday');
eq(S.addDays_(mon, 6).getDay(), 0, 'addDays_(+6) is Sunday (week end)');
// addDays_ handles month overflow
const jan31 = new Date(2026, 0, 31);
eq(S.addDays_(jan31, 1), new Date(2026, 1, 1), 'addDays_ rolls Jan 31 -> Feb 1');

// newId_ produces unique-looking ids
const ids = new Set([S.newId_(), S.newId_(), S.newId_()]);
eq(ids.size, 3, 'newId_ unique across calls');

/* ================= MENU WIRING ================= */
// Every function the menu calls must be defined somewhere in the source.
const allSrc = fs.readdirSync(dir).filter((f) => f.endsWith('.gs'))
  .map((f) => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
['buildSystem', 'addSampleData', 'refreshDashboard', 'calendarSync',
 'installAutoSync', 'removeAutoSync', 'onOpen', 'autoSyncOnChange']
  .forEach((fn) => ok(new RegExp(`function\\s+${fn}\\b`).test(allSrc), `menu handler "${fn}" defined`));

/* ================= REPORT ================= */
console.log(`\nStudio OS scout tests: ${pass} passed, ${fail} failed`);
if (fail) { console.log('\nFAILURES:'); fails.forEach((f) => console.log('  ✗ ' + f)); process.exit(1); }
console.log('All green.');
