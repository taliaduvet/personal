# Roadmap: “Test everything” for Parking Lot

`QA_FULL_CHECKLIST.md` lists **every behavior** worth signing off (boot, Today bar, columns, cloud, voice, PWA, etc.). **Not all of those can run inside one local command** without trade-offs. This doc is the agreement for what **`npm run qa:full`** is supposed to mean now and how you close the gap.

## Three tiers

| Tier | Command / how | What it proves |
|------|----------------|----------------|
| **A — Local automation** | `npm run qa:full` → **Vitest** + **Playwright** (stubbed `window.supabase`, `window.chrono` in E2E) | Domain math + “happy path” UI that does not need a real server, mic, or install flow. |
| **B — Staging / secrets** | You run the same checklist in a browser with real `config.js` + test Supabase (or a dedicated CI job with secrets) | RLS, pair sync, push, Talk about, email triage **for real**. |
| **C — Human-only** | Checklist rows marked 🔊 / install / deep a11y | Voice recognition, “Add to Home Screen,” subtle focus traps. |

**Honest ceiling:** Tier **C** will always need a person sometimes. Tier **B** is “everything cloud-shaped.” Tier **A** is the **regression vault** you can run fifty times a day.

## Definition of done (engineering)

1. Every **Tier A** row in `QA_FULL_CHECKLIST.md` either:
   - has a **Playwright** test (prefer title with checklist id, e.g. `B2 …`), or  
   - has **Vitest** coverage for pure logic, or  
   - is explicitly **excluded** with a one-line reason (e.g. “requires real push permission”).
2. Tier **B** / **C** rows stay in the checklist with 🔌 / 🔊 / 📱 and a short **runbook** (“open staging URL, enable push, …”).
3. New features **add** a checklist row first, then automation in the same PR when possible.

## How we grow Tier A

- **One section per file** under `e2e/` (`checklist-b-today.spec.js`, later `checklist-c-columns.spec.js`, …) keeps failures legible.
- Reuse **`e2e/helpers.js`** (`resetApp`, `quickAddLines`, sidebar helpers) so boot matches.
- When logic is **pure**, add **`js/__tests__/`** instead of clicking through the UI.

## Current snapshot

- **Vitest:** tasks, habits, piles/people (`npm run test`).
- **Playwright:** functional flows, QA smokes, **Today bar (section B)** — see **Automation coverage** in `QA_FULL_CHECKLIST.md` (update as you add files).

When Tier A matches every non-cloud, non-voice, non-install row, you have “everything automatable at your desk.” Tier B + C complete the story for shipping.
