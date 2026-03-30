# RLS audit — Parking Lot (Supabase)

**Status:** Template — fill before treating the app as **public-ready** (see M6 in [MODULAR_REFACTOR_CHECKLIST.md](./MODULAR_REFACTOR_CHECKLIST.md)).

For each table the app touches via `supabase.js` / anon key:

| Table | Intended access (anon / authenticated) | SELECT | INSERT | UPDATE | DELETE | Notes |
|-------|----------------------------------------|--------|--------|--------|--------|-------|
| *(add rows)* | | | | | | |

Checklist:

- [ ] No broader `USING (true)` on PII than required.
- [ ] Pair / device sync rows scoped by `pair_id` or `device_sync_id` as appropriate.
- [ ] Email triage / agent tables limited to owning pair or service role only.

Link your Supabase project policy screenshots or SQL exports here when done.
