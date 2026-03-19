-- Gluten-free medical expense tracker. Run in Supabase SQL editor after main accounting schema.
-- Tables: gf_products (catalog), gf_receipts (upload metadata), gf_purchases (line items). All RLS by user_id.
-- Storage: reuse acct_receipts bucket with path {user_id}/gf/{receipt_id}/{filename}.

-- GF product catalog (optional helper for baseline regular prices)
create table if not exists public.gf_products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  baseline_regular_unit_price_cents int check (baseline_regular_unit_price_cents is null or baseline_regular_unit_price_cents >= 0),
  unit_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index gf_products_user on public.gf_products(user_id);

alter table public.gf_products enable row level security;

create policy gf_products_select on public.gf_products for select using (auth.uid() = user_id);
create policy gf_products_insert on public.gf_products for insert with check (auth.uid() = user_id);
create policy gf_products_update on public.gf_products for update using (auth.uid() = user_id);
create policy gf_products_delete on public.gf_products for delete using (auth.uid() = user_id);

-- GF receipts (standalone uploads; one receipt can have many gf_purchases lines)
create table if not exists public.gf_receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_path text not null,
  file_name text not null,
  receipt_date date,
  uploaded_at timestamptz not null default now(),
  done_at timestamptz
);

create index gf_receipts_user on public.gf_receipts(user_id);
create index gf_receipts_uploaded on public.gf_receipts(user_id, uploaded_at desc);

alter table public.gf_receipts enable row level security;

create policy gf_receipts_select on public.gf_receipts for select using (auth.uid() = user_id);
create policy gf_receipts_insert on public.gf_receipts for insert with check (auth.uid() = user_id);
create policy gf_receipts_update on public.gf_receipts for update using (auth.uid() = user_id);
create policy gf_receipts_delete on public.gf_receipts for delete using (auth.uid() = user_id);

-- GF purchases (one row per GF product line from a receipt)
create table if not exists public.gf_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  purchase_date date not null,
  receipt_id uuid references public.gf_receipts(id) on delete set null,
  product_id uuid references public.gf_products(id) on delete set null,
  product_name text not null,
  quantity numeric not null check (quantity > 0),
  gf_total_cents bigint not null check (gf_total_cents >= 0),
  regular_unit_price_cents int not null check (regular_unit_price_cents >= 0),
  gf_size_grams numeric check (gf_size_grams is null or gf_size_grams > 0),
  regular_size_grams numeric check (regular_size_grams is null or regular_size_grams > 0),
  gf_size_value numeric check (gf_size_value is null or gf_size_value > 0),
  gf_size_unit text check (gf_size_unit is null or gf_size_unit in ('g','kg','oz','lb','ml','l')),
  regular_size_value numeric check (regular_size_value is null or regular_size_value > 0),
  regular_size_unit text check (regular_size_unit is null or regular_size_unit in ('g','kg','oz','lb','ml','l')),
  includes_only_you boolean not null default true,
  created_at timestamptz not null default now()
);

create index gf_purchases_user_date on public.gf_purchases(user_id, purchase_date desc);
create index gf_purchases_receipt on public.gf_purchases(receipt_id);
create index gf_purchases_product on public.gf_purchases(product_id);

alter table public.gf_purchases enable row level security;

create policy gf_purchases_select on public.gf_purchases for select using (auth.uid() = user_id);
create policy gf_purchases_insert on public.gf_purchases for insert with check (auth.uid() = user_id);
create policy gf_purchases_update on public.gf_purchases for update using (auth.uid() = user_id);
create policy gf_purchases_delete on public.gf_purchases for delete using (auth.uid() = user_id);
