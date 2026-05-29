-- Hub · Supabase starter schema
-- This is a STARTER, not a finished schema. Claude Code should refine it as
-- features come in. Naming and types reflect the design files in /designs.

-- ─────────────────────────────────────────────────────────────────────────
-- USERS — extends supabase auth.users with app-level preferences
-- ─────────────────────────────────────────────────────────────────────────
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  accent_color text default '#9b6cff', -- the action color preference
  email_digest text default 'weekly' check (email_digest in ('off','weekly','monthly')),
  notifications text default 'silent' check (notifications in ('silent','billing','everything')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- PRODUCTS — the catalog of tools (Vein, Ledger, Production, future ones)
-- ─────────────────────────────────────────────────────────────────────────
create table public.products (
  id text primary key,             -- 'vein' | 'ledger' | 'production'
  name text not null,              -- 'Vein'
  tagline text,
  status text not null check (status in ('concept','alpha','beta','live','soon')),
  flavor_color text not null,      -- '#b0cdfd' (periwinkle for Vein)
  one_time_price_cents integer,
  monthly_floor_cents integer default 500,  -- $5
  max_months integer default 24,
  app_url text,
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- OWNERSHIP — what a user has access to (owned outright OR renting)
-- ─────────────────────────────────────────────────────────────────────────
create table public.ownership (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  product_id text not null references public.products(id),
  kind text not null check (kind in ('owned','rent_to_own','waitlist')),

  -- For rent-to-own:
  monthly_cents integer,            -- e.g. 500 = $5/mo
  total_months integer,             -- e.g. 24
  months_paid integer default 0,    -- progress
  next_charge_at timestamptz,
  status text default 'active' check (status in ('active','read_only','paused','cancelled','completed')),

  -- For both:
  license_key text unique,
  acquired_at timestamptz default now(),
  completed_at timestamptz,

  constraint one_per_user_product unique (user_id, product_id)
);

-- ─────────────────────────────────────────────────────────────────────────
-- PAYMENTS — every R2O payment attempt (success or failure)
-- ─────────────────────────────────────────────────────────────────────────
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  ownership_id uuid not null references public.ownership(id) on delete cascade,
  stripe_invoice_id text,
  amount_cents integer not null,
  status text not null check (status in ('scheduled','paid','failed','refunded')),
  scheduled_for timestamptz,
  paid_at timestamptz,
  failure_reason text,
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- EVENTS — cross-tool activity feed for the "today" strip
-- ─────────────────────────────────────────────────────────────────────────
create table public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  product_id text not null references public.products(id),
  kind text not null,               -- 'memo_captured', 'books_synced', 'sketch_dropped', etc.
  message text not null,            -- the human-readable line for the today strip
  created_at timestamptz default now()
);

create index events_user_product_idx on public.events (user_id, product_id, created_at desc);

-- ─────────────────────────────────────────────────────────────────────────
-- WAITLIST — for Production and any future not-yet-launched products
-- ─────────────────────────────────────────────────────────────────────────
create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  product_id text not null references public.products(id),
  joined_at timestamptz default now(),
  position integer,
  constraint one_waitlist_per_user_product unique (user_id, product_id)
);

-- ─────────────────────────────────────────────────────────────────────────
-- Row-level security (RLS) — users can only read/write their own data
-- ─────────────────────────────────────────────────────────────────────────
alter table public.users enable row level security;
alter table public.ownership enable row level security;
alter table public.payments enable row level security;
alter table public.events enable row level security;
alter table public.waitlist enable row level security;

create policy "users see themselves" on public.users for select using (auth.uid() = id);
create policy "users update themselves" on public.users for update using (auth.uid() = id);

create policy "users see own ownership" on public.ownership for select using (auth.uid() = user_id);
create policy "users see own payments" on public.payments for select
  using (auth.uid() = (select user_id from public.ownership where id = ownership_id));
create policy "users see own events" on public.events for select using (auth.uid() = user_id);
create policy "users see own waitlist" on public.waitlist for select using (auth.uid() = user_id);

-- Products is public-readable (the catalog)
alter table public.products enable row level security;
create policy "anyone can read products" on public.products for select using (true);

-- ─────────────────────────────────────────────────────────────────────────
-- Seed the three products
-- ─────────────────────────────────────────────────────────────────────────
insert into public.products (id, name, tagline, status, flavor_color, one_time_price_cents) values
  ('vein',       'Vein',       'voice-memo vault for solo artists',  'live', '#b0cdfd', 30000),
  ('ledger',     'Ledger',     'sole-prop accounting (canada)',      'beta', '#b198b1', 3400),
  ('production', 'Production', 'a co-producer in your pocket',       'soon', '#fbcb94', null);
