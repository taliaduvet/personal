# RLS audit — Parking Lot (Supabase)

**Status:** Working checklist for deployments. The stock SQL in `supabase-setup.sql` uses **broad anon policies** (`using (true)`) so a **pair_id / device_sync_id acts as a shared secret** in the client. Before **public commercial** use, tighten policies per table and add auth if you sell multi-tenant access.

## Tables touched by the browser (`supabase.js`, anon key)

| Table | Intended access | SELECT | INSERT | UPDATE | DELETE | Notes |
|-------|-----------------|--------|--------|--------|--------|-------|
| `talk_about` | anon, scoped by `pair_id` in app logic | ✓ (policy may be `true`) | ✓ | ✓ | ✓ | **Risk:** open policy = any anon client can read/write all rows. **Target:** `pair_id = current_setting('request.headers', true)::json->>'x-pair-id'` or move to authenticated JWT claims. |
| `user_preferences` | anon, `(pair_id, added_by)` | ✓ | ✓ | ✓ | ✓ | Same as above; tighten to pair + identity. |
| `device_preferences` | anon, `device_sync_id` secret | ✓ | ✓ | ✓ | ✓ | **Critical:** treat `device_sync_id` like a password; RLS should allow only rows where `device_sync_id` matches a header or claim you set from Edge Function, not `true`. |
| `email_tasks` | anon, `pair_id` + `added_by` | ✓ | ✓ | ✓ | ✓ | Scope SELECT/UPDATE/DELETE to matching `pair_id` and `added_by`. |
| `processed_emails` | service / agent | ✓ | ✓ | — | — | Prefer **service role only** for agent; never ship service key to the browser. |
| `agent_runs` | anon read for status; agent insert | ✓ | ✓ | — | — | Restrict INSERT to service role or signed edge function. |
| `triage_run_requests` | per migration SQL | ✓ | ✓ | — | — | Confirm policies in `supabase-triage-run-requests.sql`. |
| `push_subscriptions` | device / user | ✓ | ✓ | ✓ | ✓ | See `supabase-push-migration.sql`; avoid cross-device subscription leakage. |
| `reminders` | device / pair | ✓ | ✓ | ✓ | ✓ | See push migration files. |

## Checklist

- [ ] No accidental `USING (true)` on production for PII-heavy tables without understanding the tradeoff.
- [ ] `pair_id` and `device_sync_id` treated as secrets; document rotation if a code leaks.
- [ ] Email triage / agent paths: **writes** from the open web should be **Edge Function + service role** where possible.
- [ ] Realtime channels: confirm publication only includes tables that match RLS expectations.
- [ ] Export actual policy SQL from the Supabase dashboard when this audit is “done” and paste or link below.

## Subprocessors (privacy)

See `privacy-policy.html` in the app root: Supabase, static host (e.g. GitHub Pages), CDNs used by `index.html`.
