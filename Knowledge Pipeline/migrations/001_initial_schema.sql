-- Knowledge Pipeline — Initial Schema
-- Run this in the Supabase SQL editor for your new project

-- -----------------------------------------------------------------------
-- Sources — every piece of raw material ever ingested
-- -----------------------------------------------------------------------
create table if not exists sources (
  id              uuid primary key default gen_random_uuid(),
  type            text not null check (type in ('article', 'video', 'podcast', 'book')),
  title           text not null,
  url             text default '',
  author          text default '',
  status          text not null default 'queued'
                    check (status in ('queued', 'extracted', 'done')),
  raw_text        text default '',
  records_created int  default 0,
  processed_at    timestamptz,
  created_at      timestamptz default now()
);

-- -----------------------------------------------------------------------
-- Knowledge items — extracted and validated production knowledge
-- -----------------------------------------------------------------------
create table if not exists knowledge_items (
  id                   uuid primary key default gen_random_uuid(),
  source_id            uuid references sources(id) on delete set null,
  discipline           text not null
                         check (discipline in (
                           'bass', 'drums', 'harmony', 'melody',
                           'arrangement', 'mixing', 'sound-design',
                           'mastering', 'vocal', 'universal'
                         )),
  type                 text not null
                         check (type in (
                           'style', 'technique', 'character',
                           'principle', 'problem', 'writing', 'reference'
                         )),
  title                text not null,
  one_liner            text not null,
  sections             jsonb not null default '{}',
  context              jsonb not null default '{}',
  sources              jsonb not null default '[]',
  attribution_tier     int  not null check (attribution_tier in (1, 2, 3)),
  depth_score          int  not null check (depth_score in (1, 2, 3)),
  conflict_of_interest boolean not null default false,
  scope                text[] default '{}',
  filters              text[] default '{}',
  meta                 jsonb not null default '{}',
  criteria_evaluation  jsonb not null default '{}',
  flags                text[] default '{}',
  status               text not null default 'pending'
                         check (status in ('pending', 'published', 'rejected')),
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);

-- -----------------------------------------------------------------------
-- Indexes for common queries
-- -----------------------------------------------------------------------
create index if not exists knowledge_items_status     on knowledge_items(status);
create index if not exists knowledge_items_discipline on knowledge_items(discipline);
create index if not exists knowledge_items_type       on knowledge_items(type);
create index if not exists knowledge_items_created    on knowledge_items(created_at desc);

-- -----------------------------------------------------------------------
-- Auto-update updated_at
-- -----------------------------------------------------------------------
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger knowledge_items_updated_at
  before update on knowledge_items
  for each row execute function update_updated_at();

-- -----------------------------------------------------------------------
-- Row Level Security — service role key bypasses these
-- Enable if you ever expose the anon key to a review UI
-- -----------------------------------------------------------------------
alter table sources        enable row level security;
alter table knowledge_items enable row level security;

-- Allow service role full access (pipeline scripts use service role key)
create policy "service_role_all" on sources
  using (true) with check (true);

create policy "service_role_all" on knowledge_items
  using (true) with check (true);
