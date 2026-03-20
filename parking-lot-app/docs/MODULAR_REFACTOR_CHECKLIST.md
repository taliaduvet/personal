# Modular refactor — Definition of Done

Companion to the Cursor plan *Parking Lot modular + launch*. Use this for **merge criteria** and **verification** while splitting [`js/app-main.js`](../js/app-main.js).

## Import rules (non-negotiable unless the PR documents an exception)

| Layer | May import | Must not |
| --- | --- | --- |
| `utils/` | utils only | `state`, DOM |
| `config/` | `globalThis` / env checks only | `state` |
| `storage/` | `state`, `constants`, `storage/migrations.js` | `domain`, `render`, `features` |
| `domain/` | `state`, `constants`, utils | `document`, `storage`, `render`, `features` |
| `render/` | `domain`, `utils`, read-mostly `state` + callbacks | ad-hoc `state` writes (use callbacks) |
| `features/` | `render`, `domain`, `state`, `storage` | — |
| Bootstrap (`app-main.js` / `bootstrap.js`) | everything | stay thin — wiring only |

**Realtime:** only [`sync/realtime.js`](../js/) (or bootstrap calling a single `initRealtime()` there) should attach Supabase channels — avoid duplicate `subscribe` calls after splits.

---

## Milestone checklists

### M1 — Foundation

- [ ] `utils/dom.js`, `config/supabase-env.js`, `storage/pair-device.js` wired; app loads clean.
- [ ] [`sw.js`](../sw.js): cache version bumped; new modules precached **or** `js/**/*.js` handled network-first (verify offline/refresh).
- [ ] `config/` does not import `state.js`.
- [ ] This doc + **Module map** subsection in [APP_ARCHITECTURE.md](./APP_ARCHITECTURE.md) updated.

### M2 — Persistence + tasks

- [ ] Smoke tests pass (solo board, add task, columns/piles, settings).
- [ ] `domain/` **never** imports `storage/`; orchestrator calls `saveState` after mutations.
- [ ] `storage/` never imports `domain/`, `render/`, `features/`.

### M3 — Piles, people, habits

- [ ] Smoke tests pass.
- [ ] No `document.` in `domain/` executable code.
- [ ] Relationships: rules in domain, UI in `features/relationships.js` — no duplicated business logic.

### M4 — Render + events

- [ ] Smoke + column drill + task drag (if applicable).
- [ ] Theme lives in `ui/theme.js` only.
- [ ] `render/` mutates `state` only via injected callbacks (document exceptions in PR).

### M5 — Features + bootstrap

- [ ] Smoke + journal + consistency + email triage (if used).
- [ ] Bootstrap file **under ~250 lines** (200 aspirational).
- [ ] Realtime centralized per rules above.

### M6 — Launch / trust

- [ ] Privacy/terms linked; subprocessors, export/delete, data-loss story substantive.
- [ ] Per-table RLS audit documented (e.g. `docs/RLS_AUDIT.md`).
- [ ] `LICENSE`; BUILD_REF has no private URLs.

---

## Smoke checklist (after M2 and M5)

1. Solo path → main board.
2. Add task; columns and piles views.
3. Settings save.
4. Device sync / pair flows you ship.
5. Offline banner; hard refresh after SW update.

---

## Verification greps

From repo root:

```bash
cd parking-lot-app/js

rg "from ['\"]\\./state\\.js['\"]|from ['\"]\\.\\./state\\.js['\"]" config utils 2>/dev/null || true
rg "from ['\"].*/(storage|render|features)/" domain 2>/dev/null || true
rg "from ['\"].*/(domain|render|features)/" storage 2>/dev/null || true
rg "\\bdocument\\." domain 2>/dev/null || true
```

*Empty output = pass* for the import rules (last grep: **review** any hits manually).

Folders that do not exist yet will yield no matches — run again after each milestone.

---

## Automated test (optional, recommended before commercial)

One Playwright (or similar) test: load app → shell visible → add task or assert board. Run in CI after M4–M5.
