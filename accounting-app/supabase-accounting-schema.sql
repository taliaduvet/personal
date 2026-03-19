-- Accounting app: run this in your Supabase SQL editor (new project).
-- Tables are prefixed acct_. All rows scoped by user_id; RLS enforces.

-- Income
create table if not exists public.acct_income (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  amount_cents bigint not null check (amount_cents >= 0),
  gst_cents bigint not null default 0 check (gst_cents >= 0),
  client_or_project text,
  vendor text,
  income_type text check (income_type in ('gig','royalties','streaming','sync','teaching','merch','contract','other')),
  note text,
  created_at timestamptz not null default now()
);

create index acct_income_user_date on public.acct_income(user_id, date desc);

alter table public.acct_income enable row level security;

create policy acct_income_select on public.acct_income for select using (auth.uid() = user_id);
create policy acct_income_insert on public.acct_income for insert with check (auth.uid() = user_id);
create policy acct_income_update on public.acct_income for update using (auth.uid() = user_id);
create policy acct_income_delete on public.acct_income for delete using (auth.uid() = user_id);

-- Expenses
create table if not exists public.acct_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  amount_cents bigint not null check (amount_cents >= 0),
  gst_cents bigint not null default 0 check (gst_cents >= 0),
  category text not null,
  vendor text,
  total_payment_cents bigint check (total_payment_cents is null or total_payment_cents >= 0),
  note text,
  created_at timestamptz not null default now()
);

create index acct_expenses_user_date on public.acct_expenses(user_id, date desc);

alter table public.acct_expenses enable row level security;

create policy acct_expenses_select on public.acct_expenses for select using (auth.uid() = user_id);
create policy acct_expenses_insert on public.acct_expenses for insert with check (auth.uid() = user_id);
create policy acct_expenses_update on public.acct_expenses for update using (auth.uid() = user_id);
create policy acct_expenses_delete on public.acct_expenses for delete using (auth.uid() = user_id);

-- Planned (recurring) income/expenses for budget
create table if not exists public.acct_planned (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('income', 'expense')),
  label text not null,
  amount_cents bigint not null check (amount_cents >= 0),
  category text,
  income_type text check (income_type is null or income_type in ('gig','royalties','streaming','sync','teaching','merch','contract','other')),
  frequency text not null default 'monthly' check (frequency in ('weekly', 'biweekly', 'monthly', 'yearly')),
  created_at timestamptz not null default now()
);

create index acct_planned_user on public.acct_planned(user_id);

alter table public.acct_planned enable row level security;

create policy acct_planned_select on public.acct_planned for select using (auth.uid() = user_id);
create policy acct_planned_insert on public.acct_planned for insert with check (auth.uid() = user_id);
create policy acct_planned_update on public.acct_planned for update using (auth.uid() = user_id);
create policy acct_planned_delete on public.acct_planned for delete using (auth.uid() = user_id);

-- Link actuals to planned (run after acct_planned exists)
alter table public.acct_income add column if not exists planned_id uuid references public.acct_planned(id) on delete set null;
alter table public.acct_expenses add column if not exists planned_id uuid references public.acct_planned(id) on delete set null;

-- Receipts (file metadata; files in Storage)
create table if not exists public.acct_receipts (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.acct_expenses(id) on delete cascade,
  file_path text not null,
  file_name text not null,
  uploaded_at timestamptz not null default now()
);

create index acct_receipts_expense on public.acct_receipts(expense_id);

alter table public.acct_receipts enable row level security;

create policy acct_receipts_all on public.acct_receipts for all using (
  exists (select 1 from public.acct_expenses e where e.id = expense_id and e.user_id = auth.uid())
);

-- Bank transactions
create table if not exists public.acct_bank_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  description text,
  amount_cents bigint not null,
  source_file_name text,
  imported_at timestamptz not null default now(),
  ignored_at timestamptz
);

create index acct_bank_tx_user_date on public.acct_bank_transactions(user_id, date desc);
create index acct_bank_tx_user_imported on public.acct_bank_transactions(user_id, imported_at desc);

alter table public.acct_bank_transactions enable row level security;

create policy acct_bank_tx_select on public.acct_bank_transactions for select using (auth.uid() = user_id);
create policy acct_bank_tx_insert on public.acct_bank_transactions for insert with check (auth.uid() = user_id);
create policy acct_bank_tx_update on public.acct_bank_transactions for update using (auth.uid() = user_id);
create policy acct_bank_tx_delete on public.acct_bank_transactions for delete using (auth.uid() = user_id);

-- Reconciliation (one tx -> one income OR one expense)
create table if not exists public.acct_reconciliation (
  id uuid primary key default gen_random_uuid(),
  bank_transaction_id uuid not null references public.acct_bank_transactions(id) on delete cascade unique,
  income_id uuid references public.acct_income(id) on delete cascade,
  expense_id uuid references public.acct_expenses(id) on delete cascade,
  constraint acct_recon_one check (
    (income_id is not null and expense_id is null) or (income_id is null and expense_id is not null)
  )
);

create index acct_recon_income on public.acct_reconciliation(income_id);
create index acct_recon_expense on public.acct_reconciliation(expense_id);

alter table public.acct_reconciliation enable row level security;

create policy acct_recon_select on public.acct_reconciliation for select using (
  exists (select 1 from public.acct_bank_transactions bt where bt.id = bank_transaction_id and bt.user_id = auth.uid())
);
create policy acct_recon_insert on public.acct_reconciliation for insert with check (
  exists (select 1 from public.acct_bank_transactions bt where bt.id = bank_transaction_id and bt.user_id = auth.uid())
);
create policy acct_recon_update on public.acct_reconciliation for update using (
  exists (select 1 from public.acct_bank_transactions bt where bt.id = bank_transaction_id and bt.user_id = auth.uid())
);
create policy acct_recon_delete on public.acct_reconciliation for delete using (
  exists (select 1 from public.acct_bank_transactions bt where bt.id = bank_transaction_id and bt.user_id = auth.uid())
);

-- Categorization rules
create table if not exists public.acct_categorization_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pattern_type text not null check (pattern_type in ('contains','exact')),
  pattern text not null,
  entry_type text not null check (entry_type in ('expense','income')),
  category_id text,
  income_type text check (income_type in ('gig','royalties','streaming','sync','teaching','merch','contract','other')),
  gst_eligible boolean,
  created_at timestamptz not null default now()
);

create index acct_rules_user on public.acct_categorization_rules(user_id);

alter table public.acct_categorization_rules enable row level security;

create policy acct_rules_select on public.acct_categorization_rules for select using (auth.uid() = user_id);
create policy acct_rules_insert on public.acct_categorization_rules for insert with check (auth.uid() = user_id);
create policy acct_rules_update on public.acct_categorization_rules for update using (auth.uid() = user_id);
create policy acct_rules_delete on public.acct_categorization_rules for delete using (auth.uid() = user_id);

-- Storage bucket for receipts (create in Dashboard or via API; policy below assumes bucket name acct_receipts)
insert into storage.buckets (id, name, public) values ('acct_receipts', 'acct_receipts', false)
on conflict (id) do nothing;

create policy acct_receipts_storage_upload on storage.objects for insert
with check (bucket_id = 'acct_receipts' and auth.uid()::text = (storage.foldername(name))[1]);
create policy acct_receipts_storage_select on storage.objects for select
using (bucket_id = 'acct_receipts' and auth.uid()::text = (storage.foldername(name))[1]);
create policy acct_receipts_storage_delete on storage.objects for delete
using (bucket_id = 'acct_receipts' and auth.uid()::text = (storage.foldername(name))[1]);

-- If you already have acct_expenses, add partial-expense support with:
-- alter table public.acct_expenses add column if not exists total_payment_cents bigint;

-- If you already have acct_income/acct_expenses and are adding budget (planned) support:
-- 1. Create acct_planned (run the create table + index + RLS + policies block above).
-- 2. alter table public.acct_income add column if not exists planned_id uuid references public.acct_planned(id) on delete set null;
-- 3. alter table public.acct_expenses add column if not exists planned_id uuid references public.acct_planned(id) on delete set null;
