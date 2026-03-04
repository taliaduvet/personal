-- Run this in Supabase Dashboard → SQL Editor
-- Creates the talk_about table for the Couples Parking Lot app

create table if not exists talk_about (
  id uuid default gen_random_uuid() primary key,
  pair_id text not null,
  text text not null,
  added_by text not null,
  created_at timestamptz default now(),
  resolved boolean default false
);

alter table talk_about enable row level security;

-- Allow all for anon (pair_id acts as shared secret)
-- For a product, you'd add proper auth and restrict by user/pair
drop policy if exists "Allow all for anon" on talk_about;
create policy "Allow all for anon" on talk_about
  for all using (true) with check (true);

-- Enable Realtime so both partners see Talk about updates live
-- (If you get "already exists", the table is already in the publication—you're good.)
alter publication supabase_realtime add table talk_about;

-- User preferences (column colors per user, synced across devices)
create table if not exists user_preferences (
  id uuid default gen_random_uuid() primary key,
  pair_id text not null,
  added_by text not null,
  column_colors jsonb default '{}',
  unique(pair_id, added_by)
);
alter table user_preferences enable row level security;
drop policy if exists "Allow all for anon" on user_preferences;
create policy "Allow all for anon" on user_preferences for all using (true) with check (true);

-- Email triage agent tables (added_by scopes each person's triage separately)
create table if not exists email_tasks (
  id uuid default gen_random_uuid() primary key,
  pair_id text not null,
  added_by text not null,
  thread_id text,
  email_id text,
  subject text,
  text text not null,
  category text not null,
  deadline date,
  priority text default 'medium',
  draft_reply text,
  added_at timestamptz default now(),
  approved boolean default false
);
alter table email_tasks enable row level security;
drop policy if exists "Allow all for anon" on email_tasks;
create policy "Allow all for anon" on email_tasks for all using (true) with check (true);
-- If "already exists" error, table is already in publication — you're good
alter publication supabase_realtime add table email_tasks;

create table if not exists processed_emails (
  email_id text primary key,
  processed_at timestamptz default now()
);
alter table processed_emails enable row level security;
drop policy if exists "Allow all for anon" on processed_emails;
create policy "Allow all for anon" on processed_emails for all using (true) with check (true);

create table if not exists agent_runs (
  id uuid default gen_random_uuid() primary key,
  pair_id text not null,
  added_by text not null,
  run_at timestamptz default now(),
  status text not null,
  emails_processed int default 0,
  tasks_created int default 0,
  error_message text
);
alter table agent_runs enable row level security;
drop policy if exists "Allow all for anon" on agent_runs;
create policy "Allow all for anon" on agent_runs for all using (true) with check (true);
