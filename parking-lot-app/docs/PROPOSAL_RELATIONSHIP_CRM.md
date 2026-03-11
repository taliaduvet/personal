# Relationship CRM in the Parking Lot App — Architecture Proposal

## Goal

Introduce a LunaTask-style “relationship tracking” layer so the app can help users stay in touch with people and tie tasks to relationships, without turning into a full contact manager.

## LunaTask-style reference (summary)

- **Relationship hierarchy:** People grouped by closeness (e.g. family, close friends, casual friends, acquaintances, business).
- **Reconnect rules:** Per-person “reconnect every X” and “last connected” so the app can surface “due to reconnect” and reminders.
- **Tasks linked to people:** Tasks can be attached to a person; relationship view shows related tasks.
- **Custom fields per person:** Notes, birthday, anniversary, “things to discuss next time,” etc.
- **Memories timeline:** Journal/notes tied to a person (e.g. “what we talked about”) and optional “happy memories” timeline.

## How it could map onto this app

### 1. People as a first-class entity

- **State:** `state.people = [{ id, name, group?, wantToImprove?, lastConnected?, reconnectRule?, notes?, customFields? }]`.
- **Groups:** Fixed or configurable tiers (e.g. Family, Close friends, Casual friends, Acquaintances, Business) to match “life areas” or stay separate.
- **Persistence:** New key in localStorage (and device prefs if synced); same pattern as `piles` / `habits`.

### 2. Tasks linked to a person

- **Task model:** Add optional `personId` to items (like `pileId` / `category`).
- **UI:** In Add/Edit task, optional “Person (optional)” dropdown. In columns or piles view, optional filter or badge “for [Person name].”
- **Suggest Next / Today:** Optional rule: “today include one ‘reconnect’ or person-linked task” or “prioritize tasks for people due to reconnect.”

### 3. Reconnect logic

- **Per person:** `reconnectRule`: e.g. `{ interval: '2weeks' | '1month' | '3months', lastConnected: ISO date }`.
- **Derived:** “Due to reconnect” = lastConnected + interval &lt; today (or next due date).
- **Surfacing:** Badge or strip “Reconnect with X” in header or a small “Relationships” widget (like consistency small), or a dedicated Relationships view/sidebar.

### 4. Lightweight “CRM” view

- **List by group:** Collapsible sections (Family, Close friends, …) with count and “due to reconnect” highlight.
- **Person detail:** Side panel or modal: name, group, last connected, reconnect rule, notes, “things to discuss,” and list of tasks linked to this person.
- **No full contact sync:** No calendar/contacts import in v1; manual entry only.

### 5. Talk about / partner integration

- If “Talk about” is used with a partner, optional “Discuss with [Partner]” or “For [Person]” on talk items so relationship context is visible without building a full CRM.

## Recommendation

- **Phase 1:** Add `personId` to tasks + `state.people` with minimal fields (name, group, lastConnected, reconnectRule, notes). One “People” or “Relationships” view: list people by group, show “due to reconnect,” link to tasks.
- **Phase 2:** Reconnect reminders in header or a small widget; optional “Suggest next: reconnect with X” in Suggest Next.
- **Phase 3:** Per-person notes/timeline and custom fields if needed.

## Data model (sketch)

- `state.people`: `Array<{ id, name, group, wantToImprove?, lastConnected?, reconnectRule?, notes? }>`.
- `item.personId`: optional string (person id).
- Reconnect: `reconnectRule = { interval: '2w'|'1m'|'3m' }`; compute “due” from `lastConnected + interval`.

## Out of scope for v1

- End-to-end encryption of relationship data (align with existing app privacy later if desired).
- Calendar/contact sync, birthdays/anniversaries (can add as custom fields later).
