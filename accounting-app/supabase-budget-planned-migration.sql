-- =============================================================================
-- Run this entire script in: Supabase Dashboard → SQL Editor → New query.
-- Paste, then click Run. This creates the budget planned table and links.
-- =============================================================================

-- 1. Create planned table (recurring income/expenses: weekly, biweekly, monthly, yearly)
create table if not exists public.acct_planned (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('income', 'expense')),
  label text not null,
  amount_cents bigint not null check (amount_cents >= 0),
  category text,
  income_type text check (income_type is null or income_type in ('gig','royalties','streaming','sync','teaching','merch','other')),
  frequency text not null default 'monthly' check (frequency in ('weekly', 'biweekly', 'monthly', 'yearly')),
  created_at timestamptz not null default now()
);

create index if not exists acct_planned_user on public.acct_planned(user_id);

alter table public.acct_planned enable row level security;

drop policy if exists acct_planned_select on public.acct_planned;
drop policy if exists acct_planned_insert on public.acct_planned;
drop policy if exists acct_planned_update on public.acct_planned;
drop policy if exists acct_planned_delete on public.acct_planned;

create policy acct_planned_select on public.acct_planned for select using (auth.uid() = user_id);
create policy acct_planned_insert on public.acct_planned for insert with check (auth.uid() = user_id);
create policy acct_planned_update on public.acct_planned for update using (auth.uid() = user_id);
create policy acct_planned_delete on public.acct_planned for delete using (auth.uid() = user_id);

-- 2. Add planned_id to income and expenses (run after acct_planned exists)
alter table public.acct_income add column if not exists planned_id uuid references public.acct_planned(id) on delete set null;
alter table public.acct_expenses add column if not exists planned_id uuid references public.acct_planned(id) on delete set null;

-- 3. If acct_planned already existed with only 'monthly', allow other intervals:
alter table public.acct_planned drop constraint if exists acct_planned_frequency_check;
alter table public.acct_planned add constraint acct_planned_frequency_check check (frequency in ('weekly', 'biweekly', 'monthly', 'yearly'));
