-- Fix infinite recursion on user_profiles RLS (partner policy queried same table).
drop policy if exists "Partner profile read" on user_profiles;
create policy "Partner profile read" on user_profiles
  for select using (
    pair_id is not null and pair_id != ''
    and pair_id = get_my_pair_id()
  );

-- Ensure helper bypasses RLS when reading own pair_id
create or replace function get_my_pair_id()
  returns text
  language sql
  stable
  security definer
  set search_path = public
as $$
  select pair_id from public.user_profiles where user_id = auth.uid() limit 1
$$;
