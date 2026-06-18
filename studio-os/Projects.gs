/**
 * Studio OS — Projects tab (columns A..G).
 *
 * A = Project name (the join key for Tasks!C)
 * G = Project ID (hidden, stable). Project detail pages in Phase 2 read this tab.
 */
const PROJECTS_TEMPLATE_ROWS = 60;

function buildProjects_(ss) {
  const sh = getOrCreateSheet_(ss, TAB.PROJECTS);
  resetSheet_(sh);
  applyBaseSheetStyle_(sh);

  // Header
  sh.getRange(1, 1, 1, PROJECTS.HEADERS.length).setValues([upper_(PROJECTS.HEADERS)]);
  styleHeaderRow_(sh, sh.getRange(1, 1, 1, PROJECTS.HEADERS.length), PROJECTS.HEADER_HEIGHT);

  // Widths + hidden
  Object.keys(PROJECTS.WIDTHS).forEach(function (c) { sh.setColumnWidth(Number(c), PROJECTS.WIDTHS[c]); });
  PROJECTS.HIDDEN.forEach(function (c) { sh.hideColumns(c); });

  // Row heights
  for (var r = PROJECTS.FIRST_DATA_ROW; r < PROJECTS.FIRST_DATA_ROW + PROJECTS_TEMPLATE_ROWS; r++) {
    sh.setRowHeight(r, PROJECTS.ROW_HEIGHT);
  }

  // Freeze
  sh.setFrozenRows(1);
  sh.setFrozenColumns(1);

  // Status validation
  sh.getRange(PROJECTS.FIRST_DATA_ROW, PROJECTS.COL.STATUS, PROJECTS_TEMPLATE_ROWS, 1)
    .setDataValidation(listRule_(OPTIONS.projectStatus, false));

  // Goal link validation (pull from Goals!A)
  const goalRange = ss.getSheetByName(TAB.GOALS)
    .getRange(GOALS.FIRST_DATA_ROW, GOALS.COL.GOAL, GOALS_TEMPLATE_ROWS, 1);
  sh.getRange(PROJECTS.FIRST_DATA_ROW, PROJECTS.COL.GOAL, PROJECTS_TEMPLATE_ROWS, 1)
    .setDataValidation(
      SpreadsheetApp.newDataValidation().requireValueInRange(goalRange, true).setAllowInvalid(true).build()
    );

  // Target date format
  sh.getRange(PROJECTS.FIRST_DATA_ROW, PROJECTS.COL.TARGET_DATE, PROJECTS_TEMPLATE_ROWS, 1).setNumberFormat('MMM d, yyyy');

  // Thin row separators
  sh.getRange(PROJECTS.FIRST_DATA_ROW, 1, PROJECTS_TEMPLATE_ROWS, PROJECTS.HEADERS.length)
    .setBorder(false, false, false, false, false, true, COLORS.rowSeparator, SpreadsheetApp.BorderStyle.SOLID);
}
