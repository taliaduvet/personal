# Journaling in the Parking Lot App — Architecture Proposal

## Goal

Add a lightweight journaling function that fits the app’s neurodivergent-friendly, low-friction model and can connect to existing features (e.g. Seed reflections, column notes, tasks).

## Possible Directions

### 1. Free-form daily notes

- **What:** A single “Today’s notes” or “Journal” entry per day (or per “tally day” using the existing day-reset time).
- **Where:** New sidebar item or a section in the header/today area. Optional link from “Seed my render” so “I’m back” reflections can optionally be copied into the journal.
- **Persistence:** One blob per day keyed by date (e.g. `journal_YYYY-MM-DD`), stored in existing localStorage (and optionally synced with device prefs).
- **UX:** Simple textarea or rich-text area; no required structure. Optional prompt like “What’s on your mind?” to reduce blank-page friction.

### 2. Seed reflections as journal stream

- **What:** Treat `seedReflections` as a first-class journal stream: list view by date, optional filter by “seed” topic, and allow adding standalone “reflection” entries (no seed) so the same capture flow works for any rest/break.
- **Where:** “Journal” or “Reflections” in sidebar opens a chronological list; each item shows date, seed (if any), and reflection text. “Add reflection” could mirror the “I’m back” flow without the rendering step.
- **Persistence:** Already have `seedReflections`; extend with optional `standaloneReflections` or a single `journalEntries` array with `{ date, seed?, text, type: 'seed'|'standalone' }`.

### 3. Column notes + journal link

- **What:** Keep column notes as life-area scratch space, but add “Copy to journal” or “Add to journal” so selected note content can be appended to the day’s journal entry.
- **Where:** In the column-note flow (e.g. after “Turn into task”), optional “Also add to journal” that appends the same or selected text to today’s journal.

## Recommendation

Start with **Option 2** (Seed reflections as journal stream) plus a **single daily free-form field** (Option 1) in the same view. That gives:

- A clear “reflections from rest” timeline (existing seed flow).
- A low-friction “anything else today” space.
- One place to review “what came to mind” without building a full note-taking app.

## Data model (sketch)

- `state.journalEntries` (or keep `seedReflections` and add `state.journalDaily{ [date]: string }`).
- Optional: `state.journalPrompts` for rotating prompts if you add them later.

## Out of scope for v1

- Rich text, tags, search, export (can add later).
- End-to-end encryption (align with existing privacy approach if needed).
