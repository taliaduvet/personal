/**
 * Studio OS — Goals tab (columns A..I).
 *
 * A = Goal name (the join key for Tasks!K)
 * G = Type (percent|currency|count|binary), H = Progress Mode (manual|auto-count)
 * I = Goal ID (hidden, stable). Phase 2 auto-fills Current (D) for auto-count goals.
 */
const GOALS_TEMPLATE_ROWS = 60;

function buildGoals_(ss) {
  const sh = getOrCreateSheet_(ss, TAB.GOALS);
  resetSheet_(sh);
  applyBaseSheetStyle_(sh);

  // Header
  sh.getRange(1, 1, 1, GOALS.HEADERS.length).setValues([upper_(GOALS.HEADERS)]);
  styleHeaderRow_(sh, sh.getRange(1, 1, 1, GOALS.HEADERS.length), GOALS.HEADER_HEIGHT);

  // Widths + hidden
  Object.keys(GOALS.WIDTHS).forEach(function (c) { sh.setColumnWidth(Number(c), GOALS.WIDTHS[c]); });
  GOALS.HIDDEN.forEach(function (c) { sh.hideColumns(c); });

  // Row heights for the template region
  for (var r = GOALS.FIRST_DATA_ROW; r < GOALS.FIRST_DATA_ROW + GOALS_TEMPLATE_ROWS; r++) {
    sh.setRowHeight(r, GOALS.ROW_HEIGHT);
  }

  // Freeze
  sh.setFrozenRows(1);
  sh.setFrozenColumns(1);

  // Guarded progress + sparkline formulas down the template region so manual
  // entry "just works": blank until a Target is set, then computes.
  const lastRow = GOALS.FIRST_DATA_ROW + GOALS_TEMPLATE_ROWS - 1;
  const progressFormulas = [];
  const barFormulas = [];
  for (var row = GOALS.FIRST_DATA_ROW; row <= lastRow; row++) {
    progressFormulas.push(['=IF(OR($A' + row + '="",$C' + row + '=0),"",$D' + row + '/$C' + row + ')']);
    barFormulas.push(['=IF(OR($A' + row + '="",$C' + row + '=0),"",SPARKLINE($D' + row + '/$C' + row +
      ',{"charttype","bar";"max",1;"color1","' + COLORS.accent + '"}))']);
  }
  sh.getRange(GOALS.FIRST_DATA_ROW, GOALS.COL.PROGRESS, progressFormulas.length, 1).setFormulas(progressFormulas);
  sh.getRange(GOALS.FIRST_DATA_ROW, GOALS.COL.BAR, barFormulas.length, 1).setFormulas(barFormulas);
  sh.getRange(GOALS.FIRST_DATA_ROW, GOALS.COL.PROGRESS, GOALS_TEMPLATE_ROWS, 1).setNumberFormat('0%');

  // Validations for Type + Mode
  sh.getRange(GOALS.FIRST_DATA_ROW, GOALS.COL.TYPE, GOALS_TEMPLATE_ROWS, 1)
    .setDataValidation(listRule_(OPTIONS.goalType, false));
  sh.getRange(GOALS.FIRST_DATA_ROW, GOALS.COL.MODE, GOALS_TEMPLATE_ROWS, 1)
    .setDataValidation(listRule_(OPTIONS.goalMode, false));

  // Numeric formatting on Target/Current
  sh.getRange(GOALS.FIRST_DATA_ROW, GOALS.COL.TARGET, GOALS_TEMPLATE_ROWS, 1).setNumberFormat('#,##0.##');
  sh.getRange(GOALS.FIRST_DATA_ROW, GOALS.COL.CURRENT, GOALS_TEMPLATE_ROWS, 1).setNumberFormat('#,##0.##');

  // Thin row separators
  sh.getRange(GOALS.FIRST_DATA_ROW, 1, GOALS_TEMPLATE_ROWS, GOALS.HEADERS.length)
    .setBorder(false, false, false, false, false, true, COLORS.rowSeparator, SpreadsheetApp.BorderStyle.SOLID);
}
