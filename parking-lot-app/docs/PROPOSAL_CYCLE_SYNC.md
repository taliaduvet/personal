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

## References

- Phase app (cycle syncing for work), and general guidance on estrogen/dopamine and PMDD (e.g. “Hardware Manual” style content you’ve used) for tone and friction logic.
