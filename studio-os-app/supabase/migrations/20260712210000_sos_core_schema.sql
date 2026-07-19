-- Studio OS core schema.
-- Lives in a shared Supabase project during development, so every table is
-- prefixed sos_. This file is the source of truth: moving to a dedicated
-- project at launch = apply the sos_ migrations there and swap env vars.
--
-- Design notes:
-- * Document-style rows: `data jsonb` holds the whole app object (Task,
--   Project, Recipe, ActivityLogEntry) so evolving a type doesn't require a
--   schema migration. Columns exist only where the server needs them
--   (identity, ordering, conflict resolution).
-- * (user_id, id) composite keys: ids are client-generated slugs, unique per
--   user, not globally.
-- * `deleted` tombstones: a device that was offline when a row was deleted
--   must see the tombstone on next pull, not resurrect the row.
-- * RLS everywhere: user_id = auth.uid() is the entire multi-tenancy story.

create or replace function public.sos_set_updated_at()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Tasks ---------------------------------------------------------------------

create table public.sos_tasks (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null,
  data jsonb not null,
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create trigger sos_tasks_updated_at
  before update on public.sos_tasks
  for each row execute function public.sos_set_updated_at();

-- Projects (registry + local meta/links) -------------------------------------

create table public.sos_projects (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null,
  data jsonb not null,
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create trigger sos_projects_updated_at
  before update on public.sos_projects
  for each row execute function public.sos_set_updated_at();

-- Recipes ---------------------------------------------------------------------

create table public.sos_recipes (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null,
  data jsonb not null,
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create trigger sos_recipes_updated_at
  before update on public.sos_recipes
  for each row execute function public.sos_set_updated_at();

-- Activity log (append-mostly studio memory) ----------------------------------
-- day_close_retro entries are replaced per dateKey by the app, so full CRUD
-- stays allowed; `at` is extracted for time-range queries.

create table public.sos_activity_log (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null,
  at timestamptz not null,
  data jsonb not null,
  primary key (user_id, id)
);

create index sos_activity_log_user_at
  on public.sos_activity_log (user_id, at);

-- Weekly review notes ----------------------------------------------------------

create table public.sos_reviews (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  week_key text not null,
  reflection text not null default '',
  intentions text not null default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, week_key)
);

create trigger sos_reviews_updated_at
  before update on public.sos_reviews
  for each row execute function public.sos_set_updated_at();

-- Logbook lines (one per local date) --------------------------------------------

create table public.sos_logbook (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date_key text not null,
  line text not null default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, date_key)
);

create trigger sos_logbook_updated_at
  before update on public.sos_logbook
  for each row execute function public.sos_set_updated_at();

-- Settings (singleton per user: week start, week planning, life areas, …) -------

create table public.sos_settings (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id)
);

create trigger sos_settings_updated_at
  before update on public.sos_settings
  for each row execute function public.sos_set_updated_at();

-- Row Level Security --------------------------------------------------------
-- One policy per table: authenticated users touch only their own rows.
-- anon gets no policy at all, so the anon key can read nothing.

alter table public.sos_tasks enable row level security;
alter table public.sos_projects enable row level security;
alter table public.sos_recipes enable row level security;
alter table public.sos_activity_log enable row level security;
alter table public.sos_reviews enable row level security;
alter table public.sos_logbook enable row level security;
alter table public.sos_settings enable row level security;

create policy "own rows" on public.sos_tasks
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "own rows" on public.sos_projects
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "own rows" on public.sos_recipes
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "own rows" on public.sos_activity_log
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "own rows" on public.sos_reviews
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "own rows" on public.sos_logbook
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "own rows" on public.sos_settings
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
