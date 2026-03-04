# Deploy Couples Parking Lot to GitHub Pages

## One-time setup

### 1. Add GitHub Secrets

In your repo: **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Add these two secrets:

| Secret name | Value |
|-------------|-------|
| `SUPABASE_URL` | `https://csvumbaxopiolwvyevum.supabase.co` |
| `SUPABASE_KEY` | Your full anon key (the long `eyJ...` string) |

### 2. Enable GitHub Pages

1. Go to **Settings** → **Pages**
2. Under **Build and deployment**:
   - **Source:** GitHub Actions
3. Save

### 3. Push to trigger deploy

Push to `main` (or run the workflow manually: **Actions** → **Deploy Couples Parking Lot** → **Run workflow**).

---

## Your live URL

After the first successful deploy:

**`https://taliaduvet.github.io/personal/`**

(Replace `taliaduvet` and `personal` with your GitHub username and repo name.)

---

## Custom domain (optional)

In **Settings** → **Pages** → **Custom domain**, add your domain and follow the DNS instructions.
