# Parking Lot — Full QA checklist

Use this as the **single source of truth** for “everything the app can do.” Execute in order or by section. Record **Pass / Fail / Blocked** (and a one-line note for failures).

## Before you start

| Item | Details |
|------|---------|
| Environment | `config.js` present; note whether Supabase URL/key are **real** or placeholder (cloud tests depend on this). |
| Clean vs dirty | For **repeatable** runs: clear site data for the origin, or use a fresh browser profile. |
| PWA / SW | First load may register a service worker; after updates, hard-refresh or bump cache per `sw.js`. |
| Automated smoke | From `parking-lot-app/`: **`npm run qa:full`** runs **Vitest + Playwright**. You can still run `npm run test` or `npm run e2e` alone. See **Automation coverage** at the end. **What “full” means:** [QA_COVERAGE_ROADMAP.md](./QA_COVERAGE_ROADMAP.md). To **watch** the browser: `npm run e2e:headed` or `npm run e2e:headed:slow`. Setup: [QA_AUTOMATION_SETUP.md](./QA_AUTOMATION_SETUP.md). |

**Legend**

- **🔌 Cloud** — needs working Supabase project + tables/RLS per `supabase-setup.sql` (and sometimes backend jobs for email triage).
- **🔊** — needs microphone / speech APIs (browser permission).
- **📱** — best verified on a phone or narrow viewport.

---

## A. Boot, offline banner, entry

| # | Case | Steps | Expected |
|---|------|-------|----------|
| A1 | Offline banner | Open app; turn network off (DevTools or OS); reload if needed | `#offline-banner` visible with offline copy; no unhandled errors |
| A2 | Online restore | Turn network on | Banner hides; optional “Back online” toast |
| A3 | Fresh install — entry | Clear storage; load app | `#entry-screen` with Solo / Couple / Link device |
| A4 | Solo path | Choose **Use on my own** | Main app appears; sidebar badge shows solo / display name |
| A5 | Couple path | Choose **Use with my partner** | `#pair-setup` with create/join |
| A6 | Create pair | Create pair → see code → Continue | Main app; pair badge; 🔌 Talk about section can sync |
| A7 | Join pair | Join with code + Talia/Garren | Main app; `addedBy` reflected where relevant |
| A8 | Link device (entry) | Link device → enter code → Link | 🔌 Preferences merge or toast; main app |
| A9 | Service worker | Load twice; check Application tab | `sw.js` registered (unless browser blocks); app shell loads offline after first visit |

---

## B. Today bar & suggestions

| # | Case | Steps | Expected |
|---|------|-------|----------|
| B1 | Today list empty state | No tasks in Today | Empty hint copy in `#today-list` |
| B2 | Add to Today | Select task(s) on board → **Add to Today** float | Tasks appear in today list; float hides when none selected |
| B3 | Clear selection | Select tasks → **Clear** on float | Selection cleared |
| B4 | Today — Done | Done on a today item | Removed from today; tally updates; archived per app rules |
| B5 | Today — Remove | Remove from suggestions | Task stays on board, not in today |
| B6 | Reorder | ↑ / ↓ on today items | Order persists after refresh |
| B7 | Clear all suggestions | **Clear suggestions** | `todaySuggestionIds` empty |
| B8 | Completed tally | Complete tasks across tally window | `#completed-tally` matches expected count / reset hour |
| B9 | Suggest-next strip | Complete a task when other tasks exist | Strip may offer “next”; Add to Today / dismiss work |
| B10 | Consistency small block | Add at least one habit (later) | `#consistency-small` may show; **View full dashboard** opens panel |
| B11 | Email triage dropdown | Open **Email triage** | Dropdown opens; 🔌 Run triage / list depends on backend + Supabase |

---

## C. Columns & piles overview

| # | Case | Steps | Expected |
|---|------|-------|----------|
| C1 | Columns view | Default overview | Four preset columns (or creative preset); counts correct |
| C2 | Piles view | Toggle **Piles** | Pile columns + uncategorized; horizontal scroll on many piles 📱 |
| C3 | Search | Type in search | Tasks filter; empty columns if no match |
| C4 | Drill down column | Click column header (non-note) | Single-column drill; **← Overview** back |
| C5 | Column note — open/close | Note button | Panel toggles; textarea focus reasonable |
| C6 | Column note — persist | Type note; wait; reload | Note restored |
| C7 | Column note — turn into task | Select text → Turn into task | Task created; note updated |
| C8 | Add from column | **+ Add** in column / pile | `#add-modal` opens with sensible default category/pile |
| C9 | Task card — expand meta | Click meta row | Priority/dates edit; ✓ collapses |
| C10 | Task — Edit | ✎ | `#edit-modal` loads fields |
| C11 | Task — Done | ✓ | Task leaves active board; archive/tally behave |
| C12 | Task — Drop | × | Removed (with undo toast when applicable) |
| C13 | Drag task — column mode | Drag card to another column | `category` updates; persists |
| C14 | Drag task — pile mode | Drag between piles | `pileId` updates |
| C15 | Drag to Today | Drop on today list | Task added to suggestions |
| C16 | Talk about (couple) | With pair: add / resolve / add to lot | 🔌 Supabase list updates; modals work |

---

## D. Add task modal (`#add-modal`)

| # | Case | Steps | Expected |
|---|------|-------|----------|
| D1 | Single tab | Title + fields + **Add** | Task appears; NLP fills category/deadline/priority when phrases match |
| D2 | Doing vs due | Phrase with “due” date only | Due date set; doing date not duplicated for same day (past doing archive rule) |
| D3 | Quick add tab | Multiple lines → **Add all** | Multiple tasks |
| D4 | Voice tab | 🔊 Start speaking → transcript → Add | Lines become tasks when recognition works |
| D5 | Recurrence | Set recurrence + complete | Respawn behavior matches expectation |
| D6 | First step / pile / person / friction | Set fields | Saved on card and in edit |
| D7 | Close modal | × or backdrop | Modal closes; no stuck focus |
| D8 | Priority hint | Click **?** near priority | Alert / copy explains tiers |

---

## E. Edit task modal (`#edit-modal`)

| # | Case | Steps | Expected |
|---|------|-------|----------|
| E1 | Save changes | Change text, category, dates, pile, person | Board refreshes; localStorage updated |
| E2 | Reminder datetime | Set reminder | 🔌 If push configured, reminder row acceptable to backend |
| E3 | Cancel | Close without save | No change to task |

---

## F. Focus mode & FABs

| # | Case | Steps | Expected |
|---|------|-------|----------|
| F1 | Focus open | Focus FAB (◎) | `#focus-mode` visible; overview/today bar hidden |
| F2 | Focus list | With today items | List matches suggestions; Done works |
| F3 | Focus close | Toggle again | Returns to overview |
| F4 | Seed FAB | Open seed modal | Picker / question / flow through “rendering” → reflection |
| F5 | Add FAB (+) | Open add modal | Same as D1 |

---

## G. Sidebar & overlays

| # | Case | Steps | Expected |
|---|------|-------|----------|
| G1 | Open / close menu | Hamburger × overlay | `sidebar.open` toggles; overlay click closes |
| G2 | Settings | Open Settings | Modal populated; long form scrolls on small screens |
| G3 | Link partner (solo) | When shown | 🔌 Pair flow works |
| G4 | Scroll long nav | Consistency … Export | All items reachable 📱 |

---

## H. Settings (`#settings-modal`)

| # | Case | Steps | Expected |
|---|------|-------|----------|
| H1 | Display name | Set → Save | Badge / pair line updates; persists |
| H2 | Suggest next toggle | Checkbox | Suggest-next strip behavior follows |
| H3 | Tally reset hour | Change hour | Completed count respects boundary |
| H4 | Category preset | Switch generic ↔ creative | Migration message; columns relabel |
| H5 | Column names & colors | Edit | Board reflects; export includes |
| H6 | Piles — add/rename/delete | Settings list | Piles board + selectors update |
| H7 | Theme colors | Button + text color | CSS vars applied |
| H8 | 🔌 Push enable | Enable push | Browser permission; status text |
| H9 | 🔌 Device sync code | View code / link device | Preferences sync or clear error toast |
| H10 | 🔌 Push now | Button | Toast success or error |
| H11 | Save | **Save** | Modal closes; toast; 🔌 optional cloud |

---

## I. Panels (consistency, journal, relationships, analytics)

| # | Case | Steps | Expected |
|---|------|-------|----------|
| I1 | Consistency | Open; metrics; add habit | Habit appears; weighted % moves when toggling |
| I2 | Journal — Daily | Type daily entry; mirror | Text persists; paragraph behavior OK |
| I3 | Journal — Reflections | Add reflection | Listed after save |
| I4 | Journal — Calendar | Pick past date | Loads/edits that day |
| I5 | Journal — Focus mode | Toggle in journal | UI simplifies per design |
| I6 | Relationships | Add person, groups, reconnect | List + detail view |
| I7 | Analytics | Open | `#analytics-text` non-empty summary |

---

## J. Archive & data portability

| # | Case | Steps | Expected |
|---|------|-------|----------|
| J1 | Archive modal | Complete tasks → View archive | Completed items listed |
| J2 | Export | **Export backup** | JSON downloads with items + today ids |
| J3 | Import | Choose JSON | State merges; toast; board refreshes |
| J4 | Invalid import | Bad file | Error toast; no corrupt state |

---

## K. Link partner modal (`#link-partner-modal`)

| # | Case | Steps | Expected |
|---|------|-------|----------|
| K1 | Create / Join / Done | Full flow from sidebar | 🔌 Pair state + optional cloud seed |

---

## L. Add from Talk about (`#add-from-talk-modal`)

| # | Case | Steps | Expected |
|---|------|-------|----------|
| L1 | Open from talk row | Add to parking lot | Prefill; **Add to lot** creates task |
| L2 | 🔌 Resolve | Resolve item | Row updates / removes |

---

## M. Email triage (UI + 🔌 backend)

| # | Case | Steps | Expected |
|---|------|-------|----------|
| M1 | Open dropdown | Email triage button | Section toggles |
| M2 | 🔌 Run triage | Button | Status text; requests row / agent behavior |
| M3 | 🔌 Approve / dismiss list items | Per-row actions | Tasks integrate with parking lot |

---

## N. Keyboard & a11y spot-checks

| # | Case | Steps | Expected |
|---|------|-------|----------|
| N1 | **N** | With focus not in input | Add modal opens |
| N2 | **Esc** | Modal / sidebar / panels | Closes topmost layer |
| N3 | **?** | Shortcuts overlay | Opens; Close works |
| N4 | Tab order | Tab through header + modal | No traps; visible focus |

---

## O. PWA / install

| # | Case | Steps | Expected |
|---|------|-------|----------|
| O1 | Manifest | DevTools → Manifest | Name, icons, theme |
| O2 | Install | Browser “Install” / Add to Home | Opens standalone; start URL correct |

---

## P. Regression / edge

| # | Case | Steps | Expected |
|---|------|-------|----------|
| P1 | Large dataset | Hundreds of tasks | Still usable; search helps |
| P2 | Long text / unicode | Task + note with emoji | Renders; saves |
| P3 | Clock / timezone | Tasks due “today” | Matches local expectations |
| P4 | Two tabs same origin | Edit both | Last write wins — document behavior |

---

## Automation coverage (Playwright + Vitest)

**Umbrella command:** `npm run qa:full` (unit + E2E).

| Area | Automated | Notes |
|------|-----------|--------|
| Unit domain logic | `npm run test` | Tasks, habits, piles/people |
| Today bar (B1, B2, B3, B4, B6, B7) | `e2e/checklist-b-today.spec.js` | Add to Today, clear, reorder, done-from-today; B5/B8–B11 not yet |
| Column notes | `e2e/app.spec.js` | |
| Done columns + piles | `e2e/app.spec.js` | |
| NLP add (deadline/category/priority) | `e2e/app.spec.js` | |
| Journal daily paragraphs | `e2e/app.spec.js` | |
| Fresh entry screen | `e2e/qa-surface.spec.js` | |
| Search filter | `e2e/qa-surface.spec.js` | |
| Quick add | `e2e/qa-surface.spec.js` | |
| Settings save (display name → localStorage) | `e2e/qa-surface.spec.js` | Stubbed cloud |
| Archive lists done task | `e2e/qa-surface.spec.js` | |
| Analytics panel | `e2e/qa-surface.spec.js` | |
| Consistency + Relationships open | `e2e/qa-surface.spec.js` | |
| Seed modal | `e2e/qa-surface.spec.js` | |
| Focus mode toggle | `e2e/qa-surface.spec.js` | |
| Export download | `e2e/qa-surface.spec.js` | |
| Shortcuts **?** | `e2e/qa-surface.spec.js` | |
| Couple flows, Talk about, email triage, push, real sync | Manual + 🔌 | Extend Playwright when stable test doubles exist |

---

## Sign-off

| Date | Tester | Build / commit | Pass rate | Blockers |
|------|--------|----------------|-----------|----------|
|      |        |                |           |          |

When this checklist is green (or failures documented), treat the release as **QA-complete** for the current scope.
