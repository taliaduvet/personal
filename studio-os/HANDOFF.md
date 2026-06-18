# Studio OS — Handoff (Phase 1: the Sheet system)

Last updated: 2026-06-18
Project folder: `studio-os`
Owner account: `hey@taliaduvet.com` (personal Drive)

| Thing | Value |
|-------|-------|
| Google Sheet | https://docs.google.com/spreadsheets/d/1_ocyGlmj-pdT5A4G61kXOYpC1LUtKopYfoGIi-5IhMo/edit |
| Sheet ID (for the Phase 2 app) | `1_ocyGlmj-pdT5A4G61kXOYpC1LUtKopYfoGIi-5IhMo` |
| Apps Script editor | https://script.google.com/d/1l30bDJtdJdP5-I0aFJsWfKFQgJ3fzn_k23qLektyal5a6d49uqbaXy4_/edit |
| Script ID | `1l30bDJtdJdP5-I0aFJsWfKFQgJ3fzn_k23qLektyal5a6d49uqbaXy4_` |
| Schema version | 1.0.0 |

> Moved from the Misfit business account (`talia@misfitmusicmgmt.com`) to the personal
> account on 2026-06-18. The old Misfit-owned Sheet/script can be deleted from that
> Drive. The previous link is preserved in `.clasp.json.misfit-backup`.

## What this is

A complete task / goal / calendar system that lives inside one Google Sheet, built
to also be the data layer for the Phase 2 React app. Calm, app-like styling; all
logic is idempotent (rebuild any time, no duplicates).

## One-time activation (must be done by you in the browser)

clasp pushed the code, but Google requires a single manual run to grant the
Sheets + Calendar permissions — this cannot be done headlessly.

1. Open the **Sheet** (link above). Reload once so the `🎛 Studio Setup` menu appears.
2. Menu → **🎛 Studio Setup → Build / Rebuild System**.
3. Approve the permission prompt (Sheets + Calendar) the first time.
4. Menu → **Add Sample Data**.
5. Menu → **Sync to Calendar** (creates the dedicated "Studio OS" calendar).
6. (Optional) Menu → **Install Auto-Sync** to keep the calendar updated automatically.

## Tabs

| Tab | Role |
|-----|------|
| Dashboard | Read-only KPIs, today's focus, deadlines, workload, goals, shipped |
| Tasks | Main tracker, columns A–O (L–O hidden, app-only) |
| Goals | Season goals with Type + Progress Mode (A–I) |
| Projects | Project metadata, joins to Tasks!C (A–G) |
| Weekly Review | Close-the-week view + editable reflection |
| _Settings | Hidden key/value store the app reads |

## Phase 2 contract (do not break)

- **Stable IDs**: Tasks!M (Task ID), Goals!I (Goal ID), Projects!G (Project ID) — UUIDs.
  The app updates rows by these IDs, never by row number.
- **Timestamps**: Tasks!N (Created At), Tasks!O (Completed At).
- **Calendar event IDs**: Tasks!L stores `deadline:EVENT_ID|doing:EVENT_ID`.
- **Join keys**: Tasks!C = Projects!A (name), Tasks!K = Goals!A (name).
- **Dates** are real date values, never strings.
- Headers in row 1; data from row 2; no merged cells in Tasks/Goals/Projects.
- Timezone: the system reads the Sheet's own timezone (File → Settings → Time zone)
  and stores it in `_Settings.timezone`. Change the Sheet timezone, then Rebuild, to localize.

## User Acceptance Test

1. **Build**: run Build / Rebuild System → 6 tabs appear, gridlines hidden, Lexend font.
2. **Sample data**: run Add Sample Data → Tasks fills with 10 rows, colored category /
   priority / status pills, deadlines within 3 days show in dark red.
3. **Dashboard**: KPIs show numbers; "Today's focus", "Upcoming deadlines",
   "Workload by category", "Goals", and "Shipped this week" all populate.
4. **Calendar**: run Sync to Calendar → a "Studio OS" calendar appears in Google
   Calendar with events for each task's deadline and doing-day, plus a recurring
   "Weekly Review — Studio OS" block.
5. **Complete a task**: set a task's Status to `Done` → after a sync, its calendar
   event(s) disappear and Tasks!L clears for that row.
6. **Change a deadline**: edit a deadline → after a sync, the calendar event moves
   (no duplicate is created).
7. **Idempotency**: run Build / Rebuild System again → no duplicate tabs, rows, or events.

## Deploy (from this folder)

This project is owned by the personal account, stored under the clasp user `personal`
(the `default` clasp user stays the Misfit business account, used by other projects):

```bash
clasp --user personal push --force
```

The first push of new permissions will still require the one manual run above so
Google can authorize the added scope.
