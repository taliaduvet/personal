-- Add income type 'contract' (Contract work). Run in Supabase SQL Editor if you already have the accounting schema.
-- Constraint names may vary; if you get "constraint does not exist", skip that line or check your table's constraint names.

alter table public.acct_income drop constraint if exists acct_income_income_type_check;
alter table public.acct_income add constraint acct_income_income_type_check
  check (income_type in ('gig','royalties','streaming','sync','teaching','merch','contract','other'));

alter table public.acct_planned drop constraint if exists acct_planned_income_type_check;
alter table public.acct_planned add constraint acct_planned_income_type_check
  check (income_type is null or income_type in ('gig','royalties','streaming','sync','teaching','merch','contract','other'));

alter table public.acct_categorization_rules drop constraint if exists acct_categorization_rules_income_type_check;
alter table public.acct_categorization_rules add constraint acct_categorization_rules_income_type_check
  check (income_type in ('gig','royalties','streaming','sync','teaching','merch','contract','other'));
