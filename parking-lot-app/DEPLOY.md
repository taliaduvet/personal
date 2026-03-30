# Deploy Couples Parking Lot to GitHub Pages

## Standalone repo (separate URL from Ledger)

To get **`https://YOUR_USER.github.io/parking-lot/`** (and your own custom domain), copy **this entire folder** to a new empty GitHub repo and use **`.github/workflows/deploy-pages.yml`**. Step-by-step for both apps: **`../docs/two-repos-setup.md`** (from the Personal monorepo root).

---

## Which workflow runs?

| Layout | Workflow | Notes |
|--------|-----------|--------|
| **Monorepo** (`personal` repo) | [`.github/workflows/deploy-couples-pages.yml`](../../.github/workflows/deploy-couples-pages.yml) at repo root | Builds `deploy/parking-lot-app/` and other apps. **Runs Parking Lot tests first** (Vitest + Playwright); deploy fails if tests fail. |
| **Standalone** repo (only Parking Lot) | `parking-lot-app/.github/workflows/deploy-pages.yml` **only if** that folder is the **repository root** | GitHub ignores nested `.github` in monorepos — copy this folder to its own repo for this path. Job detects repo root vs nested `parking-lot-app/`. |

## Monorepo deploy (`personal` vault)

## One-time setup

### 1. Add GitHub Secrets

In your repo: **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Add these two secrets:

| Secret name | Value |
|-------------|-------|
| `SUPABASE_URL` | Your Supabase project URL (e.g. `https://xxx.supabase.co`) |
| `SUPABASE_KEY` | Your full anon key (the long `eyJ...` string) |

### 2. Enable GitHub Pages (required before first deploy)

1. Go to **Settings** → **Pages** (under "Code and automation")
2. Under **Build and deployment**:
   - **Source:** GitHub Actions
3. Click **Save**

If you skip this step, the workflow will fail with "Get Pages site failed."

### 3. Push to trigger deploy

Push to `main` (or run the workflow manually: **Actions** → **Deploy Couples Parking Lot** → **Run workflow**).

---

## Your live URLs

After the first successful deploy:

- **Landing page:** `https://taliaduvet.github.io/personal/`
- **Parking Lot app:** `https://taliaduvet.github.io/personal/parking-lot-app/`

(Replace `taliaduvet` and `personal` with your GitHub username and repo name.)

---

## Custom domain (optional)

In **Settings** → **Pages** → **Custom domain**, add your domain and follow the DNS instructions.

---

## Stale PWA / bad deploy recovery

The service worker bumps `CACHE_NAME` when offline behavior changes. If users see an old bundle after deploy: **hard refresh** (e.g. Shift+Reload) or clear **site data** for the Pages origin. See [docs/STRUCTURE.md](./docs/STRUCTURE.md) (Service worker section).

If **Playwright fails on CI**, open the **Actions** artifact `parking-lot-playwright-results` (monorepo workflow) for traces/screenshots.
