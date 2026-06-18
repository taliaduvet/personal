/**
 * Studio OS — sample data.
 *
 * Idempotent: clears existing data rows then writes a fixed, realistic set for
 * an independent musician. Dates are generated RELATIVE to the current week so
 * the dashboard ("due this week", "shipped this week") always looks alive,
 * whenever the buyer runs it.
 */
function addSampleData() {
  const ss = SpreadsheetApp.getActive();

  seedProjects_(ss);
  seedGoals_(ss);
  seedTasks_(ss);

  SpreadsheetApp.flush();
  refreshDashboard(true);
  toast_('Sample data added — 10 tasks, 3 goals, 2 projects.');
}

/** Monday of the current week (local). */
function thisMonday_() {
  const now = new Date();
  const daysSinceMon = (now.getDay() + 6) % 7; // Sun=0 -> 6, Mon=1 -> 0
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysSinceMon);
}

/** Pure-date offset helper (handles month overflow, no time component). */
function addDays_(base, n) {
  return new Date(base.getFullYear(), base.getMonth(), base.getDate() + n);
}

function seedProjects_(ss) {
  const sh = ss.getSheetByName(TAB.PROJECTS);
  // Clear data region (keep header/formatting/validation)
  sh.getRange(PROJECTS.FIRST_DATA_ROW, 1, PROJECTS_TEMPLATE_ROWS, PROJECTS.HEADERS.length).clearContent();

  const target = addDays_(thisMonday_(), 80);
  const rows = [
    ['Spring EP', 'Debut EP · 7 tracks', 'Active', target, COLORS.category.Release.fg, 'Release Spring EP', newId_()],
    ['Summer Tour', '6-date regional run', 'Active', addDays_(target, 30), COLORS.category.Touring.fg, 'Confirm summer dates', newId_()],
  ];
  sh.getRange(PROJECTS.FIRST_DATA_ROW, 1, rows.length, PROJECTS.HEADERS.length).setValues(rows);
}

function seedGoals_(ss) {
  const sh = ss.getSheetByName(TAB.GOALS);
  // Clear only the value columns; leave the E/F guarded formulas intact.
  sh.getRange(GOALS.FIRST_DATA_ROW, GOALS.COL.GOAL, GOALS_TEMPLATE_ROWS, 4).clearContent();      // A..D
  sh.getRange(GOALS.FIRST_DATA_ROW, GOALS.COL.TYPE, GOALS_TEMPLATE_ROWS, 3).clearContent();        // G..I

  // A..D
  const left = [
    ['Release Spring EP', 'Target — September 2026', 1, 0.64],
    ['Secure grant funding', '$3.5k raised of $8k goal', 8000, 3500],
    ['Confirm summer dates', '4 of 6 venues booked', 6, 4],
  ];
  sh.getRange(GOALS.FIRST_DATA_ROW, GOALS.COL.GOAL, left.length, 4).setValues(left);

  // G..I (Type, Mode, Goal ID) — Type drives how the app formats progress.
  const right = [
    ['percent', 'manual', newId_()],   // Release Spring EP -> 64%
    ['currency', 'manual', newId_()],  // Secure grant funding -> $3.5k / $8k
    ['count', 'manual', newId_()],     // Confirm summer dates -> 4 / 6
  ];
  sh.getRange(GOALS.FIRST_DATA_ROW, GOALS.COL.TYPE, right.length, 3).setValues(right);
}

function seedTasks_(ss) {
  const sh = ss.getSheetByName(TAB.TASKS);
  sh.getRange(TASKS.FIRST_DATA_ROW, 1, TASKS_VALIDATION_ROWS, TASKS.HEADERS.length).clearContent();

  const mon = thisMonday_();
  const created = addDays_(mon, -7);
  const NONE = '';

  // [task, cat, project, pri, deadlineOffset|null, targetWeekOffset, doing, status, notes, goal, completedOffset|null]
  const spec = [
    ['Grant narrative — Canada Council', 'Grant', 'Spring EP', 'High', 3, 0, 'Tue', 'In progress', '2,000 words + budget tab', 'Release Spring EP', null],
    ['Master "Lowlight" (final)', 'Release', 'Spring EP', 'High', 5, 0, 'Wed', 'In progress', 'v3 mix back from Sary', 'Release Spring EP', null],
    ['Confirm Montreal backline', 'Touring', 'Summer Tour', 'Med', 4, 0, 'Mon', 'To do', 'amps, drum riser, DI boxes', 'Release Spring EP', null],
    ['Upload metadata + ISRCs', 'Admin', 'Spring EP', 'Med', 7, 7, 'Thu', 'To do', 'writers, splits, UPC', 'Secure grant funding', null],
    ['Pitch playlist editors', 'Promo', 'Spring EP', 'Low', null, 7, 'Fri', 'Not started', '12 curator contacts', 'Secure grant funding', null],
    ['Submit FACTOR application', 'Grant', 'Summer Tour', 'High', 9, 7, 'Thu', 'Not started', 'tour budget + itinerary', 'Confirm summer dates', null],
    ['Draft press one-sheet', 'Promo', 'Spring EP', 'Med', 11, 7, 'Fri', 'To do', 'bio, hi-res photos, links', 'Confirm summer dates', null],
    ['Approved EP cover art', 'Release', 'Spring EP', 'Med', -3, -7, 'Mon', 'Done', 'final approved', '', 0],
    ['Sent EPK to 8 blogs', 'Promo', 'Spring EP', 'Med', -2, -7, 'Tue', 'Done', 'follow up in 1 wk', '', 1],
    ['Locked final tracklist', 'Release', 'Spring EP', 'High', -4, -7, 'Wed', 'Done', '7 tracks', '', 0],
  ];

  const rows = spec.map(function (t) {
    const deadline = (t[4] === null) ? NONE : addDays_(mon, t[4]);
    const targetWeek = addDays_(mon, t[5]);
    const completed = (t[10] === null) ? NONE : addDays_(mon, t[10]);
    return [
      t[0],   // A Task
      t[1],   // B Category
      t[2],   // C Project
      t[3],   // D Priority
      deadline,    // E Hard Deadline
      targetWeek,  // F Target Week
      t[6],   // G Doing Day
      t[7],   // H Status
      t[8],   // I Notes
      NONE,   // J Drive Link
      t[9],   // K Goal
      NONE,   // L Calendar Event ID
      newId_(),  // M Task ID
      created,   // N Created At
      completed, // O Completed At
    ];
  });

  sh.getRange(TASKS.FIRST_DATA_ROW, 1, rows.length, TASKS.HEADERS.length).setValues(rows);
}
