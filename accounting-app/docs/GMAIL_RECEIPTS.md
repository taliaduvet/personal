# Gmail: “Receipt” emails → labels by month

Use this when you **email yourself** photos/PDFs (e.g. from your phone) with **“receipt”** in the subject so monthly bookkeeping is easy to find.

## What you get

- A filter catches messages whose **subject includes `receipt`** (case ignored in the script; Gmail’s filter UI is case-sensitive for “contains” — use both `receipt` and `Receipt` if you want).
- Optional **Apps Script** creates labels like **`Receipts/2026-04`** (nested under `Receipts`) using the **date of the email**, not the calendar when you run the script.

Gmail **filters alone** cannot say “put this in April’s sub-label” dynamically; the script handles that.

---

## Step 1 — Create labels (optional)

You can create nothing up front. The script will create `Receipts/2026-04`, etc.  
Or create a parent label **Receipts** in Gmail → Settings → Labels → Create new label.

---

## Step 2 — Filter (highlight + keep out of spam)

1. Gmail → **Settings** (gear) → **See all settings** → **Filters and Blocked Addresses** → **Create a new filter**.
2. **From:** your own address (e.g. `you@gmail.com`).  
   **Subject:** `receipt` (add a second filter for `Receipt` if you like capitalization variants).  
   **Has the words:** leave blank unless you need extra rules.
3. **Search** to test, then **Create filter**.
4. Check:
   - **Apply the label:** `Receipts` (or any base label you like).
   - **Never send it to Spam** (recommended).
   - Optional: **Skip the Inbox** if you want a clean inbox (then find mail under the label).
5. **Create filter.**

This does **not** create monthly sub-labels by itself—that’s Step 3.

---

## Step 3 — Apps Script (month sub-labels)

1. Open [script.google.com](https://script.google.com) → **New project**.
2. Paste the script below (file `Code.gs`), **save**.
3. Select function **`installReceiptLabelTrigger`** from the dropdown → **Run** → authorize Gmail access.
4. That installs a **time-driven trigger** (every hour) so new mail gets labeled without remembering to run anything.

**What it does**

- Finds threads in **Inbox** whose **first message subject** contains `receipt` (case-insensitive).
- Skips threads that already have a label matching `Receipts/????-??`.
- Adds label `Receipts/YYYY-MM` using the **date of the oldest message in the thread** (usually when you sent it).

To process **old** mail once, run **`labelReceiptThreadsByMonth`** manually from the editor.

---

## Script (`Code.gs`)

```javascript
/**
 * Labels self-sent "receipt" emails under Receipts/YYYY-MM (by message date).
 * Run installReceiptLabelTrigger() once to enable hourly processing.
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
    if (RECEIPT_SUB_RE.test(labels[i].getName())) return true;
  }
  return false;
}

function subjectHasReceipt_(thread) {
  var sub = thread.getMessages()[0].getSubject() || '';
  return sub.toLowerCase().indexOf('receipt') !== -1;
}

function labelReceiptThreadsByMonth() {
  // Inbox only so we don’t re-scan archived mail every hour; adjust if you use Skip Inbox.
  var threads = GmailApp.search('in:inbox newer_than:180d', 0, 100);
  threads.forEach(function (thread) {
    if (!subjectHasReceipt_(thread)) return;
    if (hasMonthReceiptLabel_(thread)) return;
    var msg = thread.getMessages()[0];
    var name = monthLabelName_(msg.getDate());
    var label = GmailApp.getUserLabelByName(name);
    if (!label) label = GmailApp.createLabel(name);
    thread.addLabel(label);
  });
}

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
```

**If you use “Skip the Inbox”** in the filter, change the search from `in:inbox` to something like `label:receipts -in:trash` (adjust to your base label name) so the script still sees new mail.

---

## Habits that help

- Subject line: **`receipt — Vendor — 2026-04-01`** so search and your own memory stay easy.
- Attach the photo/PDF; Gmail search **`has:attachment label:receipts`** narrows quickly for month-end.

This setup lives only in **Google**; the Ledger app does not read your Gmail.
