# How “you click every QA row for me” works

There is no separate robot in your apartment. What we use instead is **browser automation**: **Playwright** drives a real **Chrome** window (or headless Chrome), sends the same clicks and typing a human would, and reports pass/fail. In Cursor, **I run those commands in your project**, read the failures, and patch the tests or the app until green.

That **is** “clicking in your place” in a repeatable, sharable way.

---

## 1. One-time setup on your Mac

1. **Node** — You already use `npm` in this repo.
2. **Chrome** — The project uses **your installed Chrome** (`channel: 'chrome'` in `playwright.config.js`), so you do **not** have to download Playwright’s bundled Chromium unless you change config.
3. **Install JS deps** (from `parking-lot-app/`):

   ```bash
   npm install
   ```

4. **(Optional)** If Playwright ever asks for browser binaries:

   ```bash
   npx playwright install
   ```

---

## 2. How a run works

- **`playwright.config.js`** starts a tiny static server (`node e2e/server.mjs`) at `http://127.0.0.1:4173` and runs tests against it.
- Tests live in **`e2e/*.spec.js`**. **`e2e/fixtures.js`** wires Playwright so each **worker** reuses **one** browser context (one headed window per worker). Default Playwright uses a **new context per test**, which usually means a **new Chrome window** every time — great for isolation, noisy to watch.
- Helpers (solo boot, stubbed Supabase, sidebar scrolling) are in **`e2e/helpers.js`**. With **`npm run e2e`** Playwright may still use **several workers** (often **two** on a Mac), so headed runs can show **two** steady windows, not fifteen. Use **`--workers=1`** (as in `e2e:headed:slow`) for a **single** window.

**Commands** (from `parking-lot-app/`):

| Command | What it does |
|--------|----------------|
| `npm run e2e` | Full Playwright suite, **headless** (no window). |
| `npm run e2e:headed` | Same tests, **visible Chrome** — you literally watch the clicks. |
| `npm run e2e:headed:slow` | Headed run with **~400ms between actions** and a **smaller window** (top-left) so it is easier to follow and leaves room for other work. One worker so only one browser at a time. |
| `npm run e2e:ui` | Playwright **UI mode** — pick tests, watch traces, time travel. |
| `npm run e2e:debug` | Pauses with **Inspector** on the first test (step through). |

**If headed mode felt like a strobe light:** use `e2e:headed:slow` or **`npm run e2e:ui`** (you choose when each test runs). **While a test is driving Chrome, do not click inside that window** — your other apps and other desktops are fine. Slower pacing: set `PW_SLOW_MO=800` (milliseconds) before `playwright test --headed`.

After a failure, open the trace:

```bash
npx playwright show-trace test-results/<folder>/trace.zip
```

---

## 3. Mapping `QA_FULL_CHECKLIST.md` → Playwright

- Every row that **can** run with **local storage only** (no real Supabase, no email worker) should eventually have a matching **`test('…')`** — use the checklist **ID** in the title, e.g. `C3 Search filters tasks`.
- Rows marked **🔌 Cloud** need one of:
  - **A)** Stubs/mocks (what we do today with `window.supabase` in `resetApp`), or  
  - **B)** A **dedicated test Supabase** project + env vars + secrets **not** committed, or  
  - **C)** `test.skip` with a reason until a safe harness exists.

Conventions that help me (the agent):

- Put new flows next to related tests in `e2e/` or add `e2e/checklist/section-c-columns.spec.js` by **checklist letter**.
- Reuse **`resetApp` / `chooseSolo` / `openSidebar` / `clickSidebarNav`** from `e2e/helpers.js` so boot stays consistent.

---

## 4. What you do vs what I do

| You | Me (in Cursor) |
|-----|----------------|
| Run `npm run e2e:headed` if you want to **see** the run | Run `npm run e2e`, read output and traces |
| Keep `config.js` out of git if it has secrets | Add tests; fix stubs when Save/sync needs new API shapes |
| Decide policy for 🔌 tests (skip vs staging project) | Implement **A** or **B** per your policy |

---

## 5. Optional: Cursor Browser / MCP

Some Cursor setups expose a **Browser** or **Puppeteer MCP** tool that can drive a visible tab from the IDE. That is **interactive** and great for one-off exploration; for **every row of the checklist**, **Playwright tests in the repo** are still the right source of truth (CI, reruns, diffs).

If you enable such an MCP, say so in chat and we can use it for **debugging** while keeping Playwright as the **regression suite**.

---

## 6. Goal state

- **`QA_FULL_CHECKLIST.md`** = human-readable contract of **all** behaviors.  
- **`e2e/**/*.spec.js`** = automated subset that grows until it covers every **non-🔌** row (and later 🔌 behind staging creds).  
- **`npm run e2e`** = the “assistant clicked everything we encoded” button.

When you ask me to “run full QA,” I will run **`npm run test` + `npm run e2e`** (and expand tests when rows are still manual-only).

---

## Troubleshooting

### All tests fail waiting for `.column-add-btn`

That means the **main board never rendered** (entry screen stuck, JS error before `init`, or the wrong thing is serving `http://127.0.0.1:4173`).

1. **Stop anything else on port 4173** — especially an old `node e2e/server.mjs` you started by hand from another folder.  
2. Run from **`parking-lot-app/`**: `npm run e2e` — Playwright starts `e2e/server.mjs` itself (unless you opt into reuse; see below).  
3. In the browser, open **`http://127.0.0.1:4173/`** while the test server runs — you should see Parking Lot with columns and **+ Add**. If not, check the browser **Console** for red errors (a syntax error in `app-main.js` will block the whole app).  
4. **Reuse server (optional):** only if you intentionally run `node e2e/server.mjs` from *this* repo first: `npm run e2e:reuse`. Default is **no reuse** so the port is never accidentally bound to the wrong process.
