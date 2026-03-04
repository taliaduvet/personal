-- Migrate email triage tasks from solo_default to your pair ID
-- Run in Supabase SQL Editor: Dashboard → SQL Editor

UPDATE email_tasks SET pair_id = 'YOUR_PAIR_ID' WHERE pair_id = 'solo_default';
UPDATE agent_runs SET pair_id = 'YOUR_PAIR_ID' WHERE pair_id = 'solo_default';
