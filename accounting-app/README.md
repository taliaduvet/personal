# Ledger – Sole Proprietor Accounting (Canada)

Track income and expenses with CRA T2125 categories and GST. Multi-user (you and your partner each have your own data). Built for artists and freelancers; aligns with Wealthsimple Tax.

## Deploy as its own repo (recommended for a clean URL)

Copy this whole folder to a new GitHub repository (e.g. **`ledger`**). The included **`.github/workflows/deploy-pages.yml`** publishes `index.html`, `app.js`, `api.js`, `styles.css`, and injects **`config.js`** from Actions secrets **`SUPABASE_URL`** + **`SUPABASE_KEY`**. Enable **Settings → Pages → GitHub Actions**.

Full step-by-step (Parking + Ledger, custom domains): in the **Personal** monorepo see **`docs/two-repos-setup.md`**.

---

## Setup

1. **Create a Supabase project** at [supabase.com](https://supabase.com). Use a new project for this app only.

2. **Run the schema**  
   In Supabase: SQL Editor → paste contents of `supabase-accounting-schema.sql` → Run.  
   **Existing projects:** If you already ran an older schema, run `supabase-vendor-columns.sql` once to add optional `vendor` columns on income and expenses.  
   Then paste and run `supabase-gf-schema.sql` (gluten-free medical expense tables).  
   If the Storage bucket creation fails, create a bucket named `acct_receipts` in Storage (private).

3. **Enable Email auth**  
   Supabase Dashboard → Authentication → Providers → Email: enable “Email” and, if you like, “Confirm email” (optional).  
   If you use **GitHub Pages**, also open **Authentication → URL Configuration** and add your live app URL (e.g. `https://YOUR_USER.github.io/REPO/accounting-app`) under **Redirect URLs** so sign-in links work from that host.

4. **Configure the app**  
   Copy `config.js.example` to `config.js`, then set:
   - `SUPABASE_URL` = your project URL  
   - `SUPABASE_ANON_KEY` = your anon/public key  
   (Supabase Dashboard → Project Settings → API.)

5. **Open the app**  
   **GitHub Pages (no local server):** If this repo deploys to Pages (same workflow as Parking Lot), open **`https://<your-username>.github.io/personal/accounting-app/`** (replace `<your-username>` and repo name if yours differ). Your hub page lists Ledger under **Personal**.  
   Uses the same repository secrets **`SUPABASE_URL`** and **`SUPABASE_KEY`** as Parking Lot.

   **Local (optional):** The app also works if you serve the **`accounting-app`** folder.

   - **Option A — double-click:** In Finder, open `accounting-app` and double-click **`serve.command`**. A Terminal window opens and starts the server. Then in your browser go to **http://127.0.0.1:8080/index.html** (use that full path, including `/index.html`).
   - **Option B — Terminal:**  
     `cd` into `accounting-app`, then run: `python3 -m http.server 8080`  
     Keep that terminal window open. Open **http://127.0.0.1:8080/index.html**.

   If you see **“connection refused”** or a blank load, the server isn’t running or you’re on the wrong port. If you ran the server from the **Personal** folder instead of **accounting-app**, use **http://127.0.0.1:8080/accounting-app/index.html** instead—or stop the server and restart it from inside `accounting-app`.

   You can also open `index.html` directly in the browser, but Supabase may behave poorly; prefer the local server above.

   Sign up with an email and password, then sign in.  
   (If the page is blank or scripts fail, ensure `config.js` exists—copy from `config.js.example`—and contains your Supabase URL and key.)

## What you can do

- **Dashboard**: YTD income, expenses, net, GST collected, GST paid; recent activity.
- **Income**: Add, edit, delete; optional **vendor**, client/project, income type (gig, royalties, streaming, etc.), GST.
- **Expenses**: Add, edit, delete; optional **vendor**, T2125 category, GST; **attach receipt photos or PDFs** (Phase 2).
- **Reports**: Pick a date range; see income/expense totals, expenses by T2125 category, and GST summary for your return.
- **Bank**: Upload a CSV from your bank; map date, description, and amount columns; see unreconciled transactions; **Create expense** or **Create income** (with suggested category/type from your saved rules), or **Ignore**. **Remember for next time** saves a rule so future similar descriptions get the same suggestion (Phase 3 + 4).
- **Gluten-free medical**: For celiac medical expense claims (CRA lines 33099/33199). Upload grocery receipts, log GF items with quantity and GF total paid, enter the regular (non-GF) price per unit (or use **Use BC average** to fetch Statistics Canada BC prices). The app computes incremental cost and builds a CRA-style yearly summary. Export CSV, print, or **Download report + receipts (ZIP)** — after you click **Apply** on the summary, that ZIP includes the same CSV plus a `receipts/` folder of files linked to lines in that period (via JSZip from the CDN).

## Test the whole system

**Automated (local):** From this folder, run `npm install` once, then **`npm run qa:full`** (Vitest + Playwright with a stubbed Supabase). That guards navigation and basic behavior; it does **not** replace checks with a real database. For a full issue/improvement pass ordered by severity, see **`docs/QA_AUDIT.md`**.

1. **Auth**: Sign up → sign in → see Dashboard.
2. **Income**: Add income (e.g. $500, type Gigs, $25 GST) → appears in list and Dashboard.
3. **Expenses**: Add expense (e.g. $50, category Office, $0 GST); optionally attach a receipt image/PDF → appears in list and Dashboard.
4. **Reports**: Set date range (e.g. this year) → Apply → check summary, by-category table, and GST section.
5. **Bank**: Create a small CSV with header row, e.g. `Date,Description,Amount` and a few rows (`2025-01-15,SPOTIFY,-9.99`). The importer supports **quoted fields** (RFC 4180–style), e.g. `Description,"1,234.56"`. Upload → map columns → Import. In the list, change “As expense” category if you like, click **Create expense** → confirm “Remember for next time?” and enter a pattern (e.g. SPOTIFY). Next time you import a tx with SPOTIFY in the description, that category will be suggested.
6. **Receipts**: Edit an expense → under “Existing receipts” click the file name to open it in a new tab.

## Files

- `index.html` – App and auth UI  
- `app.js` – Ledger logic, categories, reports  
- `api.js` – Supabase client and table access  
- `config.js` – Your Supabase URL and key (from `config.js.example`)  
- `supabase-accounting-schema.sql` – Tables and RLS (run once in Supabase)
- `supabase-gf-schema.sql` – GF product catalog, GF receipts, GF purchases tables (run after main schema)
- `js/parse-csv.js` – Bank CSV parser (loaded before `app.js`)
- `docs/INCOME_TYPES.md` – Keep `income_type` values aligned with the database

**BC average lookup**: “Use BC average” in the GF product form calls Statistics Canada’s Web Data Service for British Columbia average food prices. If you see a CORS/network error in the browser, the lookup still works when you enter the baseline price manually, or you can deploy a Supabase Edge Function that proxies the StatsCan API (same endpoints and request body as in `app.js`).
