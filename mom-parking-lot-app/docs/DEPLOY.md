# Mom's Parking Lot — live deploy

GitHub Actions injects `config.js` from repository secrets:

| Secret | Value |
|--------|--------|
| `SUPABASE_URL` | `https://feodlwvjcayfgujkxcxm.supabase.co` |
| `SUPABASE_KEY` | Talia Duvet Hub → Project Settings → API → **anon public** key (long string starting with `eyJ` — **not** the REST URL) |

Do **not** use the old paused project `csvumbaxopiolwvyevum` — the live app will hang and show sync errors.

After updating secrets: push any commit to `main` or re-run **Deploy Personal to GitHub Pages**.
