# Parking Lot — repo structure & where to change what

Use this with [MODULAR_REFACTOR_CHECKLIST.md](./MODULAR_REFACTOR_CHECKLIST.md) (layer rules) and [APP_ARCHITECTURE.md](./APP_ARCHITECTURE.md) (behavior).

## Quick map

| Path | Purpose |
|------|---------|
| [js/app-main.js](../js/app-main.js) | Bootstrap only: imports orchestrator. |
| [js/app/orchestrator.js](../js/app/orchestrator.js) | Composition root today (init, `showMainApp`, most UI until further splits). |
| [js/domain/](../js/domain/) | Business rules, **no `document`**. |
| [js/storage/](../js/storage/) | `loadState` / `saveState`, pair/device keys — **no** imports from `domain/render/features`. |
| [js/render/](../js/render/) | DOM templates / HTML builders; prefer callbacks for mutations, not direct `saveState`. |
| [js/features/](../js/features/) | Toasts, offline banner, and (planned) settings, journal, `bindEvents` extract, etc. |
| [js/ui/theme.js](../js/ui/theme.js) | Theme / CSS variables (`applyThemeColors`). |
| [js/sync/](../js/sync/) | *Planned* — single owner for Supabase realtime (`initRealtime`). |
| [e2e/](../e2e/) | Playwright; [README pattern in QA_AUTOMATION_SETUP](./QA_AUTOMATION_SETUP.md). |

## Forbidden imports (enforced by convention + greps in checklist)

- `config/` and `utils/` must not import `state.js`.
- `domain/` must not import `storage/`, `render/`, or `features/`.
- `storage/` must not import `domain/`, `render/`, or `features/`.

## CDN scripts ([index.html](../index.html))

Supabase and Chrono are **pinned** with **SRI** (`integrity` + `crossorigin="anonymous"`). When you upgrade versions:

1. Bump URLs in `index.html`.
2. Recompute hashes, e.g. `curl -s URL | openssl dgst -sha384 -binary | openssl base64 -A` → `sha384-<output>`.

## Service worker ([sw.js](../sw.js))

`CACHE_NAME` must be bumped when changing offline-breaking assets. **Network-first** applies to HTML shell, `styles.css`, and **all** `**/js/**/*.js` so new modules load without editing a precache list every PR.

## Workflows

| Scenario | Workflow file |
|----------|----------------|
| **Monorepo** (`personal` vault) | Repo root [`.github/workflows/deploy-couples-pages.yml`](../../.github/workflows/deploy-couples-pages.yml) — copies `parking-lot-app/` into Pages. **Tests** run before deploy. |
| **Standalone** repo (this folder only) | [`.github/workflows/deploy-pages.yml`](../.github/workflows/deploy-pages.yml) in this folder — auto-detects root vs `parking-lot-app/` nested copy. |

## Large refactors: `bindEvents`

`bindEvents` in orchestrator may contain **nested** helpers (e.g. relationships panel). When extracting `wireMainEvents` / events module, **move nested helpers into the same feature file** in the same PR so behavior stays localized and reviewable.

## Typed-ish `deps` for event wiring

Prefer a **small** set of callbacks passed into `wireMainEvents(deps)` (or equivalent) over a growing grab-bag. Document required keys with JSDoc `@typedef` on `deps` in the events module; import pure functions directly instead of threading them through `deps` when there is no cycle.

## Public launch order (M6)

Complete before “wide” marketing: **RLS audit** ([RLS_AUDIT.md](./RLS_AUDIT.md)), privacy/export story, `LICENSE`. See [MODULAR_REFACTOR_CHECKLIST.md](./MODULAR_REFACTOR_CHECKLIST.md) M6.

## After a bad deploy / stale PWA

Users can **hard refresh** or clear site data for the origin. Each SW bump changes `CACHE_NAME`; document in [DEPLOY.md](../DEPLOY.md).
