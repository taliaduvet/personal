-- ====================================================================
-- Auth Migration: Real Authentication for Parking Lot
-- Run ONCE in Supabase Dashboard → SQL Editor
--
-- After running this SQL, also do in the Supabase Dashboard:
--   Authentication → Providers → Email: ensure "Enable Email provider" is ON
--   Authentication → URL Configuration:
--     Site URL: your deployed app URL (e.g. https://yourname.github.io/parking-lot-app)
--     Redirect URLs: add the same URL (and http://localhost:5173 for local dev)
-- ====================================================================

-- 1. User profiles: links auth.users to app-level identity
create table if not exists user_profiles (
  user_id   uuid references auth.users(id) on delete cascade primary key,
  pair_id   text,
  display_name text not null default '',
  created_at   timestamptz default now()
);
alter table user_profiles enable row level security;

drop policy if exists "Own profile full access" on user_profiles;
create policy "Own profile full access" on user_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Partners can read each other's profiles (needed for pair verification)
drop policy if exists "Partner profile read" on user_profiles;
create policy "Partner profile read" on user_profiles
  for select using (
    pair_id is not null and pair_id != '' and
    pair_id = (select pair_id from user_profiles where user_id = auth.uid() limit 1)
  );

-- 2. Helper function: returns the current auth user's pair_id
--    Used in RLS policies below so pair-shared tables stay isolated.
create or replace function get_my_pair_id()
  returns text language sql stable security definer as $$
    select pair_id from user_profiles where user_id = auth.uid() limit 1
  $$;

-- ====================================================================
-- 3. Personal tables: scoped to auth.uid()
-- ====================================================================

-- device_preferences
alter table device_preferences add column if not exists user_id uuid references auth.users(id);

drop policy if exists "Allow all for anon" on device_preferences;
drop policy if exists "Users own their device prefs" on device_preferences;
create policy "Users own their device prefs" on device_preferences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- user_preferences (column colors, etc.)
alter table user_preferences add column if not exists user_id uuid references auth.users(id);

drop policy if exists "Allow all for anon" on user_preferences;
drop policy if exists "Users own their preferences" on user_preferences;
create policy "Users own their preferences" on user_preferences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- reminders
alter table reminders add column if not exists user_id uuid references auth.users(id);

drop policy if exists "Allow all for anon" on reminders;
drop policy if exists "Users own their reminders" on reminders;
create policy "Users own their reminders" on reminders
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- push_subscriptions
alter table push_subscriptions add column if not exists user_id uuid references auth.users(id);

drop policy if exists "Allow all for anon" on push_subscriptions;
drop policy if exists "Users own their push subscriptions" on push_subscriptions;
create policy "Users own their push subscriptions" on push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ====================================================================
-- 4. Pair-shared tables: scoped to pair_id via get_my_pair_id()
--    Both partners see the same rows because they share a pair_id.
-- ====================================================================

-- talk_about
drop policy if exists "Allow all for anon" on talk_about;
drop policy if exists "Pair members access talk_about" on talk_about;
create policy "Pair members access talk_about" on talk_about
  for all using (
    get_my_pair_id() is not null and pair_id = get_my_pair_id()
  ) with check (
    get_my_pair_id() is not null and pair_id = get_my_pair_id()
  );

-- email_tasks
drop policy if exists "Allow all for anon" on email_tasks;
drop policy if exists "Pair members access email_tasks" on email_tasks;
create policy "Pair members access email_tasks" on email_tasks
  for all using (
    get_my_pair_id() is not null and pair_id = get_my_pair_id()
  ) with check (
    get_my_pair_id() is not null and pair_id = get_my_pair_id()
  );

-- agent_runs
drop policy if exists "Allow all for anon" on agent_runs;
drop policy if exists "Pair members access agent_runs" on agent_runs;
create policy "Pair members access agent_runs" on agent_runs
  for all using (
    get_my_pair_id() is not null and pair_id = get_my_pair_id()
  ) with check (
    get_my_pair_id() is not null and pair_id = get_my_pair_id()
  );

-- triage_run_requests (only exists if the triage feature was enabled)
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'triage_run_requests'
  ) then
    execute 'drop policy if exists "Allow all for anon" on triage_run_requests';
    execute '
      create policy "Pair members request triage" on triage_run_requests
        for all using (
          get_my_pair_id() is not null and pair_id = get_my_pair_id()
        ) with check (
          get_my_pair_id() is not null and pair_id = get_my_pair_id()
        )';
  end if;
end;
$$;

-- processed_emails: global dedup table, require authentication only
drop policy if exists "Allow all for anon" on processed_emails;
drop policy if exists "Authenticated access to processed_emails" on processed_emails;
create policy "Authenticated access to processed_emails" on processed_emails
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
