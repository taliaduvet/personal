/**
 * Labels emails (typically to yourself) whose subject contains "receipt"
 * under Receipts/YYYY-MM using the thread's first message date.
 *
 * After first clasp push: open the project, run installReceiptLabelTrigger once,
 * authorize Gmail. Optional: run labelReceiptThreadsByMonth manually to backfill.
 */

var RECEIPT_PARENT = 'Receipts';
var RECEIPT_SUB_RE = /^Receipts\/\d{4}-\d{2}$/;

function monthLabelName_(date) {
  var y = date.getFullYear();
  var m = ('0' + (date.getMonth() + 1)).slice(-2);
  return RECEIPT_PARENT + '/' + y + '-' + m;
}

function hasMonthReceiptLabel_(thread) {
  var labels = thread.getLabels();
  for (var i = 0; i < labels.length; i++) {
    if (RECEIPT_SUB_RE.test(labels[i].getName())) {
      return true;
    }
  }
  return false;
}

function subjectHasReceipt_(thread) {
  var sub = thread.getMessages()[0].getSubject() || '';
  return sub.toLowerCase().indexOf('receipt') !== -1;
}

/**
 * Process recent inbox threads. Adjust the Gmail search if you use "Skip the Inbox"
 * on your receipt filter (e.g. label:receipts -in:trash).
 */
function labelReceiptThreadsByMonth() {
  var threads = GmailApp.search('in:inbox newer_than:180d', 0, 100);
  threads.forEach(function (thread) {
    if (!subjectHasReceipt_(thread)) {
      return;
    }
    if (hasMonthReceiptLabel_(thread)) {
      return;
    }
    var msg = thread.getMessages()[0];
    var name = monthLabelName_(msg.getDate());
    var label = GmailApp.getUserLabelByName(name);
    if (!label) {
      label = GmailApp.createLabel(name);
    }
    thread.addLabel(label);
  });
}

/**
 * Run once from the Apps Script editor (or after clasp push) to enable hourly runs.
 */
function installReceiptLabelTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'labelReceiptThreadsByMonth') {
      ScriptApp.deleteTrigger(t);
    }
  });
  ScriptApp.newTrigger('labelReceiptThreadsByMonth')
    .timeBased()
    .everyHours(1)
    .create();
}
