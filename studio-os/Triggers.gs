/**
 * Studio OS — installable onChange trigger for automatic Calendar sync.
 *
 * onChange fires on edits and structural changes. We keep it simple in Phase 1:
 * any change re-runs calendarSync (which is idempotent). The user can turn this
 * off from the menu, or via _Settings → calendarSyncMode = off.
 */
function installAutoSync() {
  removeAutoSync(true);
  ScriptApp.newTrigger('autoSyncOnChange')
    .forSpreadsheet(SpreadsheetApp.getActive())
    .onChange()
    .create();
  toast_('Auto-sync installed — calendar updates on every change.');
}

function removeAutoSync(silent) {
  const triggers = ScriptApp.getProjectTriggers();
  let removed = 0;
  triggers.forEach(function (t) {
    if (t.getHandlerFunction() === 'autoSyncOnChange') {
      ScriptApp.deleteTrigger(t);
      removed++;
    }
  });
  if (!silent) toast_(removed ? 'Auto-sync removed.' : 'No auto-sync trigger was installed.');
}

/** Trigger entry point — guarded so a sync error never blocks the edit. */
function autoSyncOnChange(e) {
  try {
    calendarSync();
  } catch (err) {
    console.error('autoSyncOnChange failed: ' + (err && err.message ? err.message : err));
  }
}
