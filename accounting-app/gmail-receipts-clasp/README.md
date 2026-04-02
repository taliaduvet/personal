# Gmail receipt labels — clasp project

Push this folder to a **standalone** Google Apps Script project, then run `installReceiptLabelTrigger` once in the browser.

## Prereqs

1. Install Node 18+ (if you don’t have it).
2. Install clasp globally:  
   `npm install -g @google/clasp`
3. Log in:  
   `clasp login`

## Link this folder to a new Apps Script project

From **this directory** (`accounting-app/gmail-receipts-clasp`):

```bash
clasp create --type standalone --title "Gmail receipt labels by month"
```

That creates `.clasp.json` with your `scriptId`. (**Don’t commit** `.clasp.json` — it’s in the repo root `.gitignore`.)

If you prefer to copy the example:

```bash
cp .clasp.json.example .clasp.json
# edit scriptId after clasp create, or use clasp create as above
```

## Push code

```bash
clasp push
```

Open the project in the browser:

```bash
clasp open
```

## One-time setup in the Apps Script UI

1. Select function **`installReceiptLabelTrigger`** → **Run**.
2. Approve **Gmail** permissions.
3. Confirm **Triggers** (clock icon): you should see `labelReceiptThreadsByMonth` hourly.

Optional: run **`labelReceiptThreadsByMonth`** once manually to backfill recent inbox threads.

## Timezone

Edit `appsscript.json` → `timeZone` (e.g. `America/Toronto`) so triggers and `new Date()` match where you live.

## If receipts skip the inbox

Change the search string inside `labelReceiptThreadsByMonth` in `ReceiptLabels.gs` (e.g. `label:Receipts -in:trash`) so the script still sees new mail. Then `clasp push` again.
