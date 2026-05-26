-- Triage run requests: app inserts a row; external cron/script polls this table and runs the email triage agent.
-- Run in Supabase Dashboard → SQL Editor after email_tasks/agent_runs exist.

create table if not exists triage_run_requests (
  id uuid default gen_random_uuid() primary key,
  pair_id text not null,
  added_by text,
  requested_at timestamptz default now(),
  status text default 'pending'
);
alter table triage_run_requests enable row level security;
drop policy if exists "Allow all for anon" on triage_run_requests;
create policy "Allow all for anon" on triage_run_requests for all using (true) with check (true);
