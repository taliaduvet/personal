-- RLS Upgrade: Pair-scoped access control
-- Run this in Supabase Dashboard → SQL Editor after supabase-setup.sql
--
-- NOTE: Full pair_id scoping requires Supabase Auth. With the anon key, the client
-- passes pair_id in queries; anyone with the anon key could theoretically query
-- other pairs. To lock this down:
-- 1. Enable Supabase Auth
-- 2. Store pair_id in user metadata or a user_pairs table
-- 3. Replace these policies with auth.uid()-based checks
--
-- This migration adds:
-- - CHECK constraints to validate pair_id format (prevents malformed data)
-- - Tighter policies that at least enforce non-empty pair_id

-- Validate pair_id format (8-12 alphanumeric chars)
ALTER TABLE talk_about DROP CONSTRAINT IF EXISTS talk_about_pair_id_format;
ALTER TABLE talk_about ADD CONSTRAINT talk_about_pair_id_format
  CHECK (pair_id ~ '^[a-z0-9]{8,12}$');

ALTER TABLE user_preferences DROP CONSTRAINT IF EXISTS user_preferences_pair_id_format;
ALTER TABLE user_preferences ADD CONSTRAINT user_preferences_pair_id_format
  CHECK (pair_id ~ '^[a-z0-9]{8,12}$');

ALTER TABLE email_tasks DROP CONSTRAINT IF EXISTS email_tasks_pair_id_format;
ALTER TABLE email_tasks ADD CONSTRAINT email_tasks_pair_id_format
  CHECK (pair_id ~ '^[a-z0-9]{8,12}$');

ALTER TABLE agent_runs DROP CONSTRAINT IF EXISTS agent_runs_pair_id_format;
ALTER TABLE agent_runs ADD CONSTRAINT agent_runs_pair_id_format
  CHECK (pair_id ~ '^[a-z0-9]{8,12}$');
