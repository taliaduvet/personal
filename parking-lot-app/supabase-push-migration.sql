-- Push notifications for Parking Lot PWA
-- Run in Supabase Dashboard → SQL Editor

-- Push subscriptions: store browser push subscription per device
create table if not exists push_subscriptions (
  id uuid default gen_random_uuid() primary key,
  device_sync_id text not null,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz default now(),
  unique(device_sync_id, endpoint)
);

alter table push_subscriptions enable row level security;
drop policy if exists "Allow all for anon" on push_subscriptions;
create policy "Allow all for anon" on push_subscriptions for all using (true) with check (true);

-- Reminders: due reminders to send (Edge Function queries this)
create table if not exists reminders (
  id uuid default gen_random_uuid() primary key,
  device_sync_id text not null,
  item_id text not null,
  item_text text not null,
  remind_at timestamptz not null,
  created_at timestamptz default now()
);

create index if not exists reminders_remind_at_idx on reminders(remind_at);

alter table reminders enable row level security;
drop policy if exists "Allow all for anon" on reminders;
create policy "Allow all for anon" on reminders for all using (true) with check (true);

-- Enable pg_cron and pg_net (if not already)
-- Run in Supabase Dashboard → Database → Extensions: enable pg_cron, pg_net

-- Schedule Edge Function to run every minute (run AFTER deploying the send-push function)
-- Replace YOUR_PROJECT_REF and YOUR_ANON_KEY with your Supabase project ref and anon key
-- Or use Vault: see https://supabase.com/docs/guides/functions/schedule-functions
/*
select cron.schedule(
  'send-push-reminders',
  '* * * * *',
  $$
  select net.http_post(
    url:= 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-push',
    headers:= jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_ANON_KEY'
    ),
    body:= '{}'::jsonb
  ) as request_id;
  $$
);
*/
