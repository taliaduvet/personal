-- Migrate email triage tasks from solo_default to your pair ID
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/csvumbaxopiolwvyevum/sql/new

UPDATE email_tasks SET pair_id = 'a82qqk8g' WHERE pair_id = 'solo_default';
UPDATE agent_runs SET pair_id = 'a82qqk8g' WHERE pair_id = 'solo_default';
