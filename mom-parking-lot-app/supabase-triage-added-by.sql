-- Scope email triage per user (Talia vs Garren)
-- Run in Supabase SQL Editor: Dashboard → SQL Editor

ALTER TABLE email_tasks ADD COLUMN IF NOT EXISTS added_by text;
UPDATE email_tasks SET added_by = 'Talia' WHERE added_by IS NULL;
ALTER TABLE email_tasks ALTER COLUMN added_by SET NOT NULL;

ALTER TABLE agent_runs ADD COLUMN IF NOT EXISTS added_by text;
UPDATE agent_runs SET added_by = 'Talia' WHERE added_by IS NULL;
ALTER TABLE agent_runs ALTER COLUMN added_by SET NOT NULL;
