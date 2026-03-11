# Cycle-Syncing and Menstruation-Friendly UX — Research & Proposal

## Goal

Make the app more supportive for people who menstruate by respecting cycle phases and reducing friction on high-symptom days, without requiring medical or cycle data.

## Cycle syncing (short)

- **Idea:** Align work and rest with hormonal phases (e.g. follicular, ovulation, luteal, menstruation) instead of fighting them.
- **Relevance:** Energy, focus, and tolerance for deep work vs. admin vary by phase; many report better outcomes when they plan accordingly (e.g. creative/execution in high-estrogen phases, rest and reflection in luteal/menstruation).
- **Apps like Phase:** Use cycle phase to suggest “good days” for certain task types and surface gentler expectations on low-energy days.

## How this app could adapt

### 1. Optional cycle context (no tracking in-app)

- **Settings:** Optional “I track my cycle elsewhere” with phase input: user selects current phase (e.g. Menstruation, Follicular, Ovulation, Luteal) or “I don’t use this.”
- **No calendar or dates:** App does not store cycle dates; user updates phase when they want. Reduces privacy and complexity; still allows phase-aware copy and suggestions.

### 2. Phase-aware copy and tone

- **Luteal / menstruation:** Softer language: “Suggest next” could say “When you’re ready, consider…” or “One thing you might feel up for…” Default hints could emphasize rest, small steps, and “it’s okay to do less.”
- **High-energy phases:** Keep current “Next: [task]” and “Add to Today” tone.
- **Empty / low spoons:** Everywhere, avoid guilt-heavy wording (“You have nothing due” vs “Nothing due today — use the space as you need”).

### 3. Suggest Next and friction

- **Already in app:** Suggest Next uses urgency, priority, friction. On “low energy” or “rest” phase, we could:
  - Prefer **quick / low-friction** tasks when user marks “rest day” or selects a low-energy phase.
  - Optionally **reduce** how many “suggest next” prompts appear on rest phase (e.g. one gentle suggestion instead of “next in pile” every time).
- **Implementation:** If `state.cyclePhase === 'luteal' | 'menstruation'` (or “rest”), pass a flag into `suggestNext()` to bias toward quick/medium friction and same life area, and optionally surface a short “Be kind to yourself” line in the strip.

### 4. Seed my render and rest

- **Already aligned:** “Seed my render” + “Rendering — go take a break” + “I’m back” fits rest phases well. Optional prompt on rest phase: “Consider seeding something and taking a real break” in the header or after completing a task.

### 5. Day reset and symptoms

- **Already in app:** Configurable “day resets at” (e.g. 3am) helps people who are up late or have broken sleep. No change needed unless we add “symptom-heavy days” later (e.g. hide or soften “Completed today” on user-marked rest days).

### 6. Future: cycle tracking in-app (optional)

- If we ever add cycle tracking: store only phase or “expected high/low energy” per day; use it to adjust Suggest Next and copy. No need to store detailed health data; keep it minimal and user-controlled.

---

## Front-loading: do hard tasks before luteal

**Goal:** Get the user to do tasks that are harder in luteal (rejection sensitivity, deep work, deadlines) *ahead of time* so they are actually set up to rest during those phases, instead of only softening the app once they're already in luteal.

### When is luteal (so we can say "do this before then")

- **Manual phase only (simplest):** User sets current phase. When phase is Follicular or Ovulation we treat it as "good window" and show a "do before luteal" list; no countdown. No dates stored.
- **Optional "luteal in X days":** User can set "Next luteal starts in about ___ days" (or a rough date). We show: "Luteal in ~7 days — consider doing these before then" and list the right tasks. One extra field; user updates when their cycle shifts.
- **Light prediction (no daily tracking):** User sets once: cycle length (e.g. 28) and "last period start" (or "last ovulation"). We estimate next luteal (e.g. days 21–28) and show "Luteal in ~X days." We store one date + number; still an estimate.

**Recommendation:** Support manual phase always; add optional "luteal in X days" (manual number or date) so we can show a countdown when the user wants it.

### Identifying "hard in luteal" tasks

- **Explicit tag:** Optional task field "Better before luteal" or "Hard in luteal" (rejection sensitivity, deep work, deadlines, high-stakes). User marks them; we show these in the "do before luteal" list.
- **Infer from existing data:** Use deadline in the next 2 weeks + friction = deep → treat as "good to do before luteal." No new field; can't capture "rejection-sensitive call" unless we add a tag.
- **Hybrid:** Inference by default (deadline + deep friction) so the list isn't empty, plus optional "Better before luteal" (or "Hard in luteal") so user can add rejection-sensitive / high-stakes items.

**Recommendation:** Hybrid — optional task flag "Better before luteal" and auto-include tasks with deadline in next N days and/or "deep" friction.

### Surfacing "do this before luteal"

- **"Before luteal" block when phase is high-energy:** When phase is Follicular or Ovulation (and optionally when "luteal in X days" is set), show a block: "Good window — do these before luteal" or "Luteal in ~X days — consider doing these first." List = tagged tasks + inferred (deadline soon, deep friction), sorted by deadline or deep-first. Same actions: open, add to Today, mark done.
- **Suggest Next:** When in Follicular/Ovulation, bias Suggest Next toward tasks from that "before luteal" set so after completing a task, "next" often points at that list.
- **Luteal phase:** When phase is Luteal (or Menstruation), don't push that list; show rest tone and low-friction suggestions. Optionally: "You're in rest phase — these can wait" for any remaining "hard in luteal" tasks.

### Data model (additions for front-loading)

- `state.cyclePhase`: already in sketch.
- Optional: `state.lutealInDays: number | null` (user-set "luteal starts in ~X days") or `state.nextLutealDate: string | null` (YYYY-MM-DD) for countdown.
- Optional: `task.betterBeforeLuteal: boolean` (or `hardInLuteal`) for explicit "do this before luteal" set.

**Logic:** "Before luteal" list = tasks where `betterBeforeLuteal === true` OR (deadline in next N days AND friction === 'deep'), excluding completed/archived. Sort by deadline soonest or deep first. When phase is Follicular or Ovulation: show block and bias Suggest Next toward it. When phase is Luteal/Menstruation: don't surface as "do now"; use rest tone.

### UI

- **Settings:** Phase dropdown + optional "Next luteal in about ___ days" (or date).
- **Add/Edit task:** Optional checkbox "Better before luteal" / "Hard in luteal."
- **Main view:** When phase is high-energy, a section or strip: "Good window — do these before luteal" / "Luteal in ~X days — consider doing these first" with that list and normal task actions.

### Flow in practice

1. User sets phase to Follicular (or Ovulation) and optionally "Luteal in ~10 days."
2. App shows "Luteal in ~10 days — consider doing these first" with tagged tasks and tasks with deadline soon and/or deep friction.
3. Suggest Next, after a completion, often suggests the next task from this set.
4. By the time user switches to Luteal, the list is shorter or empty; app switches to rest tone and low-friction suggestions — they're set up to rest.

---

## Recommendation

- **Phase 1:** Add optional **cycle phase** in Settings (dropdown: Off / Menstruation / Follicular / Ovulation / Luteal). Use it only for:
  - Softer, optional copy in Suggest Next when phase is Luteal or Menstruation.
  - Optional one-line hint in Seed or header (“Rest phase — consider a short render break”) when phase is set.
- **Phase 2:** Bias Suggest Next toward lower friction and same life area when phase is Luteal/Menstruation (behind the same optional setting).
- **No** cycle calendar or date storage in v1; keep it “I’ll tell you my phase when I want.”

## Data model (sketch)

- `state.cyclePhase`: `null | 'menstruation' | 'follicular' | 'ovulation' | 'luteal'`.
- Optional `state.cycleSyncEnabled`: boolean; if false, treat as no phase.
- Persist in existing settings/localStorage and device prefs if applicable.

## Implementation order

- Implement **Journal** and **Relationship CRM** first (per product priority). Cycle Sync will be planned and built after those are in place.

## References

- Phase app (cycle syncing for work), and general guidance on estrogen/dopamine and PMDD (e.g. “Hardware Manual” style content you’ve used) for tone and friction logic.
