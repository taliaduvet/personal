/**
 * Studio OS — custom menu.
 * onOpen runs automatically when the Sheet is opened.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🎛 Studio Setup')
    .addItem('Build / Rebuild System', 'buildSystem')
    .addItem('Add Sample Data', 'addSampleData')
    .addItem('Refresh Dashboard', 'refreshDashboard')
    .addSeparator()
    .addItem('Sync to Calendar', 'calendarSync')
    .addItem('Install Auto-Sync', 'installAutoSync')
    .addItem('Remove Auto-Sync', 'removeAutoSync')
    .addToUi();
}
