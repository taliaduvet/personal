-- Add user_preferences to Realtime so settings sync across devices when changed
-- Run in Supabase SQL Editor if not already in publication
alter publication supabase_realtime add table user_preferences;
