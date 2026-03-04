-- Device preferences: personal sync across your devices only (never shared with partner)
-- Run in Supabase SQL Editor

create table if not exists device_preferences (
  device_sync_id text primary key,
  preferences jsonb not null default '{}',
  updated_at timestamptz default now()
);

alter table device_preferences enable row level security;
drop policy if exists "Allow all for anon" on device_preferences;
create policy "Allow all for anon" on device_preferences for all using (true) with check (true);
alter publication supabase_realtime add table device_preferences;
