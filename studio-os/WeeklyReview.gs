/**
 * Studio OS — Weekly Review tab. Formula-driven "close the week" view plus
 * free-text Reflection + Next week intentions (the only editable cells).
 */
function buildWeeklyReview_(ss) {
  const sh = getOrCreateSheet_(ss, TAB.WEEKLY);
  resetSheet_(sh);
  applyBaseSheetStyle_(sh);

  const widths = { 1: 28, 2: 200, 3: 120, 4: 200, 5: 90, 6: 200, 7: 120, 8: 120 };
  Object.keys(widths).forEach(function (c) { sh.setColumnWidth(Number(c), widths[c]); });
  sh.getRange(1, 1, 40, 14).setBackground(COLORS.white);

  // Title
  sectionLabel_(sh, 'B2', 'WEEKLY REVIEW');
  sh.getRange('B3').setFormula(
    '="Weekly Review · "&TEXT(weekStart,"mmm d")&" – "&TEXT(weekEnd,"mmm d")'
  ).setFontSize(20).setFontWeight('bold').setFontColor(COLORS.textPrimary);

  // The numbers
  sectionLabel_(sh, 'B5', 'THE NUMBERS');
  const stats = [
    ['B', 'Completed', '=COUNTIFS(Tasks!H2:H,"Done",Tasks!O2:O,">="&weekStart,Tasks!O2:O,"<="&weekEnd)', null],
    ['C', 'Carried over', '=SUMPRODUCT((Tasks!H2:H1000<>"Done")*(Tasks!E2:E1000<>"")*(Tasks!E2:E1000<weekStart))', null],
    ['D', 'In progress', '=COUNTIF(Tasks!H2:H,"In progress")', null],
    ['E', 'Deadlines hit', '=COUNTIFS(Tasks!E2:E,">="&weekStart,Tasks!E2:E,"<="&weekEnd,Tasks!H2:H,"Done")&" / "&COUNTIFS(Tasks!E2:E,">="&weekStart,Tasks!E2:E,"<="&weekEnd)', null],
    ['F', 'Studio time', null, null], // placeholder — see Phase 2
  ];
  stats.forEach(function (s) {
    sectionLabel_(sh, s[0] + '6', s[1].toUpperCase());
    const cell = sh.getRange(s[0] + '7').setFontSize(20).setFontWeight('bold').setFontColor(COLORS.textPrimary);
    if (s[2]) cell.setFormula(s[2]); else cell.setValue('—');
  });
  sh.getRange('F8').setValue('coming in app').setFontSize(9).setFontColor(COLORS.headerText);
  cardBorder_(sh, 'B6:F8');

  // Board: Shipped / In flight / Carry over
  sectionLabel_(sh, 'B10', 'SHIPPED');
  sectionLabel_(sh, 'D10', 'IN FLIGHT');
  sectionLabel_(sh, 'F10', 'CARRY OVER');
  sh.getRange('B11').setFormula(
    '=IFERROR(QUERY(Tasks!A2:O,"select A where H = \'Done\' and O is not null and O >= date \'"&TEXT(weekStart,"yyyy-mm-dd")&"\' limit 12",0),"Nothing yet")'
  );
  sh.getRange('D11').setFormula('=IFERROR(FILTER(Tasks!A2:A,Tasks!H2:H="In progress"),"None")');
  sh.getRange('F11').setFormula(
    '=IFERROR(FILTER(Tasks!A2:A,(Tasks!H2:H<>"Done")*(Tasks!E2:E<weekStart)*(Tasks!E2:E<>"")),"None")'
  );

  // Reflection (tinted, editable)
  sectionLabel_(sh, 'B24', 'REFLECTION');
  const reflect = sh.getRange('B25:H29');
  reflect.merge();
  reflect.setBackground(COLORS.tint).setWrap(true).setVerticalAlignment('top')
    .setFontColor(COLORS.textPrimary).setValue('What went well? What ran long? What did you learn?');

  // Next week intentions (tinted, editable)
  sectionLabel_(sh, 'B31', 'NEXT WEEK INTENTIONS');
  const intent = sh.getRange('B32:H36');
  intent.merge();
  intent.setBackground(COLORS.tint).setWrap(true).setVerticalAlignment('top')
    .setFontColor(COLORS.textPrimary).setValue('Top 3 priorities and any protected studio blocks.');

  // App signpost (funnel: free Sheet -> paid app)
  sectionLabel_(sh, 'B38', 'IN THE APP');
  const wkNote = sh.getRange('B39:H40');
  wkNote.merge();
  wkNote.setValue('Browse every past week and your saved reflections, plus studio-time tracking — coming in the Studio OS app.')
    .setWrap(true).setVerticalAlignment('top').setFontColor(COLORS.textSecondary);

  setWeeklyReviewTitle_(ss);
}

/** Re-applies the dynamic week-range title formula. */
function setWeeklyReviewTitle_(ss) {
  const sh = ss.getSheetByName(TAB.WEEKLY);
  if (!sh) return;
  sh.getRange('B3').setFormula('="Weekly Review · "&TEXT(weekStart,"mmm d")&" – "&TEXT(weekEnd,"mmm d")');
}
