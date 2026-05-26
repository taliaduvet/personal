-- Mom's Parking Lot: device sync only (no couple / talk_about tables)
create table if not exists device_preferences (
  device_sync_id text primary key,
  preferences jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

alter table device_preferences enable row level security;

create policy "device_prefs_anon_all" on device_preferences
  for all using (true) with check (true);
