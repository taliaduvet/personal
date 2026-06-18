/**
 * Studio OS — build orchestrator.
 *
 * buildSystem() is fully idempotent: it creates-or-clears every tab and
 * reapplies all formatting, validation, formulas, and named ranges. Running
 * it twice produces no duplicates anywhere.
 */
function buildSystem() {
  const ss = SpreadsheetApp.getActive();

  // 1. Settings first — other steps read timezone / accent from here.
  buildSettings_(ss);

  // 2. Content tabs. Order matters:
  //    - Goals + Projects before Tasks (Tasks dropdowns reference their ranges)
  //    - Dashboard before Weekly Review (Dashboard creates the weekStart /
  //      weekEnd named ranges that Weekly Review formulas depend on)
  buildGoals_(ss);
  buildProjects_(ss);
  buildTasks_(ss);
  buildDashboard_(ss);
  buildWeeklyReview_(ss);

  // 3. Order + visibility.
  orderTabs_(ss);
  const settings = ss.getSheetByName(TAB.SETTINGS);
  if (settings) settings.hideSheet();

  // 4. Land the user on the Dashboard.
  const dash = ss.getSheetByName(TAB.DASHBOARD);
  if (dash) ss.setActiveSheet(dash);

  SpreadsheetApp.flush();
  toast_('Studio OS built. Open the menu to add sample data or sync your calendar.');
}

/** Reorder tabs to match TAB_ORDER. */
function orderTabs_(ss) {
  TAB_ORDER.forEach(function (name, i) {
    const sh = ss.getSheetByName(name);
    if (!sh) return;
    ss.setActiveSheet(sh);
    ss.moveActiveSheet(i + 1);
  });
}

/** Lightweight refresh — recompute formulas and refresh the dashboard title. */
function refreshDashboard(silent) {
  const ss = SpreadsheetApp.getActive();
  setDashboardTitle_(ss);
  setWeeklyReviewTitle_(ss);
  SpreadsheetApp.flush();
  if (!silent) toast_('Dashboard refreshed.');
}

/** Small non-blocking status message. */
function toast_(msg) {
  try {
    SpreadsheetApp.getActive().toast(msg, 'Studio OS', 5);
  } catch (e) {
    // toast can fail in non-UI contexts (e.g. triggers) — safe to ignore.
  }
}
