/**
 * Studio OS — Tasks tab (columns A..O). The main tracker.
 *
 * Visible: A..K. Hidden (app-only): L Calendar Event ID, M Task ID,
 * N Created At, O Completed At. See Config.gs for the column map and the
 * Calendar event-ID format stored in column L.
 */
const TASKS_VALIDATION_ROWS = 500; // range that gets dropdowns + conditional formatting
const TASKS_STYLE_ROWS = 200;      // range that gets explicit row heights + separators

function buildTasks_(ss) {
  const sh = getOrCreateSheet_(ss, TAB.TASKS);
  resetSheet_(sh);
  applyBaseSheetStyle_(sh);

  const nCols = TASKS.HEADERS.length;
  const firstRow = TASKS.FIRST_DATA_ROW;

  // Header
  sh.getRange(1, 1, 1, nCols).setValues([upper_(TASKS.HEADERS)]);
  styleHeaderRow_(sh, sh.getRange(1, 1, 1, nCols), TASKS.HEADER_HEIGHT);

  // Widths + hidden columns
  Object.keys(TASKS.WIDTHS).forEach(function (c) { sh.setColumnWidth(Number(c), TASKS.WIDTHS[c]); });
  TASKS.HIDDEN.forEach(function (c) { sh.hideColumns(c); });

  // Row heights for the styled region
  for (var r = firstRow; r < firstRow + TASKS_STYLE_ROWS; r++) {
    sh.setRowHeight(r, TASKS.ROW_HEIGHT);
  }

  // Freeze header + first column
  sh.setFrozenRows(1);
  sh.setFrozenColumns(1);

  // Notes wrap
  sh.getRange(firstRow, TASKS.COL.NOTES, TASKS_STYLE_ROWS, 1).setWrap(true);

  // Date formats
  sh.getRange(firstRow, TASKS.COL.DEADLINE, TASKS_VALIDATION_ROWS, 1).setNumberFormat('MMM d');
  sh.getRange(firstRow, TASKS.COL.TARGET_WEEK, TASKS_VALIDATION_ROWS, 1).setNumberFormat('MMM d');
  sh.getRange(firstRow, TASKS.COL.CREATED_AT, TASKS_VALIDATION_ROWS, 1).setNumberFormat('yyyy-mm-dd');
  sh.getRange(firstRow, TASKS.COL.COMPLETED_AT, TASKS_VALIDATION_ROWS, 1).setNumberFormat('yyyy-mm-dd');

  // Center the pill-like columns; everything else stays left.
  [TASKS.COL.CATEGORY, TASKS.COL.PRIORITY, TASKS.COL.DOING_DAY, TASKS.COL.STATUS].forEach(function (c) {
    sh.getRange(firstRow, c, TASKS_VALIDATION_ROWS, 1).setHorizontalAlignment('center');
  });

  applyTaskValidations_(ss, sh);
  applyTaskConditionalFormatting_(sh);

  // Thin row separators
  sh.getRange(firstRow, 1, TASKS_STYLE_ROWS, nCols)
    .setBorder(false, false, false, false, false, true, COLORS.rowSeparator, SpreadsheetApp.BorderStyle.SOLID);
}

/** Dropdowns for Category, Project, Priority, Doing Day, Status, Goal. */
function applyTaskValidations_(ss, sh) {
  const firstRow = TASKS.FIRST_DATA_ROW;
  const n = TASKS_VALIDATION_ROWS;

  sh.getRange(firstRow, TASKS.COL.CATEGORY, n, 1).setDataValidation(listRule_(OPTIONS.category, false));
  sh.getRange(firstRow, TASKS.COL.PRIORITY, n, 1).setDataValidation(listRule_(OPTIONS.priority, false));
  sh.getRange(firstRow, TASKS.COL.DOING_DAY, n, 1).setDataValidation(listRule_(OPTIONS.doingDay, false));
  sh.getRange(firstRow, TASKS.COL.STATUS, n, 1).setDataValidation(listRule_(OPTIONS.status, false));

  // Project — pull from Projects!A, allow new entries.
  const projRange = ss.getSheetByName(TAB.PROJECTS)
    .getRange(PROJECTS.FIRST_DATA_ROW, PROJECTS.COL.PROJECT, PROJECTS_TEMPLATE_ROWS, 1);
  sh.getRange(firstRow, TASKS.COL.PROJECT, n, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInRange(projRange, true).setAllowInvalid(true).build()
  );

  // Goal — pull from Goals!A. Strict so the join key stays clean (empty allowed).
  const goalRange = ss.getSheetByName(TAB.GOALS)
    .getRange(GOALS.FIRST_DATA_ROW, GOALS.COL.GOAL, GOALS_TEMPLATE_ROWS, 1);
  sh.getRange(firstRow, TASKS.COL.GOAL, n, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInRange(goalRange, true).setAllowInvalid(false).build()
  );
}

/** Category / Priority / Status pills + deadline-urgency rule. */
function applyTaskConditionalFormatting_(sh) {
  const firstRow = TASKS.FIRST_DATA_ROW;
  const n = TASKS_VALIDATION_ROWS;
  const rules = [];

  function pillRules(col, map) {
    const range = sh.getRange(firstRow, col, n, 1);
    Object.keys(map).forEach(function (value) {
      const c = map[value];
      rules.push(
        SpreadsheetApp.newConditionalFormatRule()
          .whenTextEqualTo(value)
          .setBackground(c.bg)
          .setFontColor(c.fg)
          .setBold(true)
          .setRanges([range])
          .build()
      );
    });
  }

  pillRules(TASKS.COL.CATEGORY, COLORS.category);
  pillRules(TASKS.COL.PRIORITY, COLORS.priority);
  pillRules(TASKS.COL.STATUS, COLORS.status);

  // Deadline urgency — Tasks column E within 3 days and not Done.
  const deadlineRange = sh.getRange(firstRow, TASKS.COL.DEADLINE, n, 1);
  rules.push(
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=AND($E2<>"",$E2<=TODAY()+3,$H2<>"Done")')
      .setFontColor(COLORS.deadlineUrgent)
      .setBold(true)
      .setRanges([deadlineRange])
      .build()
  );

  sh.setConditionalFormatRules(rules);
}
