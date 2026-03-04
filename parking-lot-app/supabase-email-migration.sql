-- Email triage agent tables — run in Supabase Dashboard → SQL Editor
-- https://supabase.com/dashboard/project/csvumbaxopiolwvyevum/sql/new

create table if not exists email_tasks (
  id uuid default gen_random_uuid() primary key,
  pair_id text not null,
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
  run_at timestamptz default now(),
  status text not null,
  emails_processed int default 0,
  tasks_created int default 0,
  error_message text
);
alter table agent_runs enable row level security;
drop policy if exists "Allow all for anon" on agent_runs;
create policy "Allow all for anon" on agent_runs for all using (true) with check (true);
