# Mom's Parking Lot — live deploy

GitHub Actions injects `config.js` from repository secrets:

| Secret | Value |
|--------|--------|
| `SUPABASE_URL` | `https://feodlwvjcayfgujkxcxm.supabase.co` |
| `SUPABASE_KEY` | **anon** / **publishable** public key only (`eyJ…` or `sb_publishable_…`). **Never** the `sb_secret_…` or service_role key. **Not** the REST URL. |

Do **not** use the old paused project `csvumbaxopiolwvyevum` — the live app will hang and show sync errors.

After updating secrets: push any commit to `main` or re-run **Deploy Personal to GitHub Pages**.
