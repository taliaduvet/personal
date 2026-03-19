-- Add optional vendor name on income and expenses. Run in Supabase SQL Editor if tables already exist.

alter table public.acct_income add column if not exists vendor text;
alter table public.acct_expenses add column if not exists vendor text;
