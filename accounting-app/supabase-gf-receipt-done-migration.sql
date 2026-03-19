-- Run this once if you already ran supabase-gf-schema.sql before done_at was added.
alter table public.gf_receipts add column if not exists done_at timestamptz;

-- Run this if gf_purchases already existed without size columns.
alter table public.gf_purchases add column if not exists gf_size_grams numeric;
alter table public.gf_purchases add column if not exists regular_size_grams numeric;
alter table public.gf_purchases add column if not exists gf_size_value numeric;
alter table public.gf_purchases add column if not exists gf_size_unit text;
alter table public.gf_purchases add column if not exists regular_size_value numeric;
alter table public.gf_purchases add column if not exists regular_size_unit text;
