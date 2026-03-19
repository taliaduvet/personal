# Two repos: Parking Lot + Ledger (separate GitHub Pages URLs)

Use this when you want **two** sites, for example:

- `https://YOUR_USER.github.io/parking-lot/`
- `https://YOUR_USER.github.io/ledger/`

…and optionally **two custom subdomains** on `taliaduvet.com` (one CNAME per repo in GitHub Pages settings).

---

## 1. Create two empty repositories on GitHub

1. **New repository** → name e.g. `parking-lot` → Public → **no** README (empty).
2. **New repository** → name e.g. `ledger` → Public → empty.

Replace `YOUR_USER` below with your GitHub username.

---

## 2. Parking Lot repo (first push)

From your Mac (adjust paths if your vault lives elsewhere):

```bash
# Copy app to a temp folder — becomes the repo ROOT
cp -R /Volumes/BitchBaby1999/Coding/Personal/parking-lot-app /tmp/parking-lot-site
cd /tmp/parking-lot-site

git init
git add .
git commit -m "Initial Parking Lot"
git branch -M main
git remote add origin https://github.com/YOUR_USER/parking-lot.git
git push -u origin main
```

On **GitHub** → that repo → **Settings** → **Secrets and variables** → **Actions**:

| Name            | Value                    |
|-----------------|--------------------------|
| `SUPABASE_URL`  | Your Supabase project URL |
| `SUPABASE_KEY`  | Anon key (`eyJ...`)      |

**Settings** → **Pages** → **Source:** GitHub Actions → Save.

After Actions finishes: **`https://YOUR_USER.github.io/parking-lot/`**

---

## 3. Ledger repo (first push)

```bash
cp -R /Volumes/BitchBaby1999/Coding/Personal/accounting-app /tmp/ledger-site
cd /tmp/ledger-site

git init
git add .
git commit -m "Initial Ledger"
git branch -M main
git remote add origin https://github.com/YOUR_USER/ledger.git
git push -u origin main
```

Same **Secrets** (`SUPABASE_URL`, `SUPABASE_KEY`) and **Pages → GitHub Actions**.

Live URL: **`https://YOUR_USER.github.io/ledger/`** (or whatever you named the repo).

---

## 4. Custom domain (per repo)

For each repo:

1. **Settings** → **Pages** → **Custom domain** → e.g. `parking.taliaduvet.com` / `ledger.taliaduvet.com`.
2. Follow GitHub’s DNS instructions (usually **CNAME** pointing to `YOUR_USER.github.io`).
3. Add those URLs in **Supabase** → **Authentication** → **URL configuration** → **Redirect URLs**.

Your registrar (Google / Squarespace / etc.) is where you edit DNS for `taliaduvet.com`.

---

## 5. Monorepo `personal` after the split

Your **Personal** vault can stay as the place you edit both apps. When something is ready:

- Copy changed files into `/tmp/parking-lot-site` or `/tmp/ledger-site` and `git push`, **or**
- Re-run the `cp -R` steps and commit only in those folders (keep the two clones somewhere permanent if you prefer).

You can **remove** Ledger from the old combined workflow in `personal` (`.github/workflows/deploy-couples-pages.yml`) once both new sites work, or leave the monorepo deploy only as a backup hub.

Workflow files for standalone deploys live in this monorepo at:

- `parking-lot-app/.github/workflows/deploy-pages.yml`
- `accounting-app/.github/workflows/deploy-pages.yml`

They are included when you `cp -R` the folders above.

---

## 6. `.gitignore` in the new repos

- **Parking:** existing `parking-lot-app/.gitignore` already ignores `config.js` locally; CI builds `config.js` on deploy.
- **Ledger:** if you add `config.js` locally for dev, add `config.js` to `.gitignore` in the new repo so keys are not committed (same pattern as monorepo).

