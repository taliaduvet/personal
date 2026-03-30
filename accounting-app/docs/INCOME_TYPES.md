# Income types vs database

Ledger’s **`income_type`** values must match the PostgreSQL check constraint on `public.acct_income`:

- **Schema:** [supabase-accounting-schema.sql](../supabase-accounting-schema.sql) — `income_type text check (income_type in (...))`
- **UI list:** `INCOME_TYPES` in [app.js](../app.js)

**When adding a new income type**

1. Add a migration (or alter the check constraint) in Supabase so the new value is allowed on `acct_income.income_type`.
2. Add the same `id` + label to `INCOME_TYPES` in `app.js`.
3. Run `npm run qa:full` locally.

If the two diverge, inserts will fail at the database with a constraint error.
