-- Restore anonymous device/pair sync for Parking Lot (no email required).
-- Authenticated users still use user_id / get_my_pair_id() policies.
-- Anon access matches pre-auth behavior: client only queries known device_sync_id / pair_id.

create policy "Legacy anon device_preferences" on device_preferences
  for all to anon
  using (true)
  with check (true);

create policy "Legacy anon talk_about" on talk_about
  for all to anon
  using (true)
  with check (true);

create policy "Legacy anon email_tasks" on email_tasks
  for all to anon
  using (true)
  with check (true);

create policy "Legacy anon agent_runs" on agent_runs
  for all to anon
  using (true)
  with check (true);
