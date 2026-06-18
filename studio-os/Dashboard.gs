/**
 * Studio OS — Dashboard tab. Read-only overview; every value is a live formula
 * pulling from Tasks / Goals. Laid out as grouped blocks (the closest Sheets
 * gets to the app's cards).
 *
 * Named ranges created here (used across the workbook):
 *   weekStart = Monday of the current week  =TODAY()-WEEKDAY(TODAY(),3)
 *   weekEnd   = weekStart + 6
 */

// Hidden config column (holds weekStart/weekEnd/nextDeadline helper cells).
const DASH_CFG_COL = 20; // column T

function buildDashboard_(ss) {
  const sh = getOrCreateSheet_(ss, TAB.DASHBOARD);
  resetSheet_(sh);
  applyBaseSheetStyle_(sh);

  // Column widths
  const widths = { 1: 28, 2: 210, 3: 150, 4: 120, 5: 95, 6: 95, 7: 165, 8: 165 };
  Object.keys(widths).forEach(function (c) { sh.setColumnWidth(Number(c), widths[c]); });

  // White canvas for the content area
  sh.getRange(1, 1, 60, 14).setBackground(COLORS.white);

  // ---- Config / named ranges --------------------------------------
  const L = colLetter_(DASH_CFG_COL);
  sh.getRange(1, DASH_CFG_COL).setFormula('=TODAY()-WEEKDAY(TODAY(),3)');
  ss.setNamedRange('weekStart', sh.getRange(1, DASH_CFG_COL));
  sh.getRange(2, DASH_CFG_COL).setFormula('=weekStart+6');
  ss.setNamedRange('weekEnd', sh.getRange(2, DASH_CFG_COL));
  sh.getRange(3, DASH_CFG_COL).setFormula(
    '=IFERROR(MIN(FILTER(Tasks!E2:E,(Tasks!H2:H<>"Done")*(Tasks!E2:E>=TODAY()))),"")'
  );
  sh.hideColumns(DASH_CFG_COL);

  // ---- Header -----------------------------------------------------
  const name = getSetting_('userName', 'there');
  sectionLabel_(sh, 'B2', 'STUDIO DASHBOARD');
  sh.getRange('B3').setValue('Good morning, ' + name)
    .setFontSize(20).setFontWeight('bold').setFontColor(COLORS.textPrimary);
  sh.getRange('B4').setFormula(
    '="You have "&COUNTIFS(Tasks!E2:E,">="&weekStart,Tasks!E2:E,"<="&weekEnd)&" tasks due this week."'
  ).setFontColor(COLORS.textSecondary);
  sh.getRange('G3').setFormula('=TEXT(TODAY(),"dddd, mmmm d")')
    .setFontWeight('bold').setHorizontalAlignment('right');
  sh.getRange('G4').setFormula('="Week of "&TEXT(weekStart,"mmm d")&" – "&TEXT(weekEnd,"mmm d")')
    .setFontColor(COLORS.headerText).setHorizontalAlignment('right');

  // ---- KPI strip --------------------------------------------------
  sectionLabel_(sh, 'B6', 'THIS WEEK');
  const kpis = [
    ['B', 'Due this week', '=COUNTIFS(Tasks!E2:E,">="&weekStart,Tasks!E2:E,"<="&weekEnd)', null],
    ['C', 'In progress', '=COUNTIF(Tasks!H2:H,"In progress")', null],
    ['D', 'Completed', '=COUNTIF(Tasks!H2:H,"Done")', null],
    ['E', 'Total tasks', '=COUNTA(Tasks!A2:A)', null],
    ['F', 'Progress', '=IFERROR(COUNTIF(Tasks!H2:H,"Done")/COUNTA(Tasks!A2:A),0)', '0%'],
  ];
  kpis.forEach(function (k) {
    sectionLabel_(sh, k[0] + '7', k[1].toUpperCase());
    const v = sh.getRange(k[0] + '8').setFormula(k[2])
      .setFontSize(22).setFontWeight('bold').setFontColor(COLORS.textPrimary);
    if (k[3]) v.setNumberFormat(k[3]);
  });
  // Next deadline line
  sh.getRange('B9').setValue('NEXT DEADLINE')
    .setFontSize(9).setFontWeight('bold').setFontColor(COLORS.headerText);
  sh.getRange('B10').setFormula('=IF($' + L + '$3="","—",TEXT($' + L + '$3,"MMM d"))')
    .setFontWeight('bold').setFontColor(COLORS.deadlineUrgent);
  sh.getRange('C10').setFormula('=IFERROR(INDEX(Tasks!A2:A,MATCH($' + L + '$3,Tasks!E2:E,0)),"")')
    .setFontColor(COLORS.textSecondary);
  cardBorder_(sh, 'B7:F10');

  // ---- App signpost (funnel: free Sheet -> paid app) --------------
  sectionLabel_(sh, 'G7', 'STUDIO OS APP');
  const appNote = sh.getRange('G8:H10');
  appNote.merge();
  appNote.setValue('Mobile · click-through navigation · weekly history — coming in the app.')
    .setWrap(true).setVerticalAlignment('top').setFontColor(COLORS.textSecondary);
  cardBorder_(sh, 'G7:H10');

  // ---- Today's focus ----------------------------------------------
  sectionLabel_(sh, 'B12', "TODAY'S FOCUS");
  sh.getRange('B13').setFormula(
    '=IFERROR(QUERY(Tasks!A2:K,"select A, C where G = \'"&TEXT(TODAY(),"ddd")&"\' and H <> \'Done\' limit 8",0),"Nothing scheduled today")'
  );

  // ---- Upcoming deadlines -----------------------------------------
  sectionLabel_(sh, 'B22', 'UPCOMING DEADLINES');
  sh.getRange('B23').setFormula(
    '=IFERROR(QUERY(Tasks!A2:K,"select E, A, B where E is not null and E >= date \'"&TEXT(TODAY(),"yyyy-mm-dd")&"\' and H <> \'Done\' order by E asc limit 5",0),"No upcoming deadlines")'
  );
  sh.getRange('B23:B27').setNumberFormat('MMM d');

  // ---- Workload by category ---------------------------------------
  sectionLabel_(sh, 'B29', 'WORKLOAD BY CATEGORY');
  OPTIONS.category.forEach(function (cat, i) {
    const row = 30 + i;
    sh.getRange('B' + row).setValue(cat).setFontColor(COLORS.textPrimary);
    sh.getRange('C' + row).setFormula('=COUNTIF(Tasks!B2:B,"' + cat + '")')
      .setFontWeight('bold').setHorizontalAlignment('right');
    sh.getRange('D' + row).setFormula(
      '=IF(C' + row + '=0,"",SPARKLINE(C' + row + ',{"charttype","bar";"max",MAX($C$30:$C$34);"color1","' +
      COLORS.category[cat].fg + '"}))'
    );
  });

  // ---- Goals ------------------------------------------------------
  sectionLabel_(sh, 'B36', 'GOALS · THIS SEASON');
  sh.getRange('B37').setFormula(
    '=IFERROR(QUERY(Goals!A2:E,"select A, E where A is not null limit 8",0),"No goals yet")'
  );
  sh.getRange('C37:C44').setNumberFormat('0%');

  // ---- Shipped this week ------------------------------------------
  sectionLabel_(sh, 'B46', 'SHIPPED THIS WEEK');
  sh.getRange('B47').setFormula(
    '=IFERROR(QUERY(Tasks!A2:O,"select A where H = \'Done\' and O is not null and O >= date \'"&TEXT(weekStart,"yyyy-mm-dd")&"\' limit 10",0),"Nothing shipped yet")'
  );

  setDashboardTitle_(ss);
}

/** Small uppercase muted section label at an A1 cell. */
function sectionLabel_(sh, a1, text) {
  sh.getRange(a1).setValue(text)
    .setFontSize(9).setFontWeight('bold').setFontColor(COLORS.headerText);
}

/** Light card border around an A1:A1 range group. */
function cardBorder_(sh, a1) {
  sh.getRange(a1).setBorder(true, true, true, true, false, false, COLORS.cardBorder, SpreadsheetApp.BorderStyle.SOLID);
}

/** Ensures the greeting reflects the current userName setting. */
function setDashboardTitle_(ss) {
  const sh = ss.getSheetByName(TAB.DASHBOARD);
  if (!sh) return;
  const name = getSetting_('userName', 'there');
  sh.getRange('B3').setValue('Good morning, ' + name);
}
