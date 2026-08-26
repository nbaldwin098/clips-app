-- Creator interaction events for the studio bubble map.
-- Viewers insert their own rows; creators read rows about their content.
-- Run in the Supabase SQL editor after 0013.

create table if not exists public.creator_interactions (
  id text primary key,
  creator_id text not null,
  content_id text,
  type text not null,
  actor_id text,
  title text not null default '',
  weight int not null default 1,
  surface text not null default 'unknown',
  content_type text,
  source text not null default 'live',
  at timestamptz not null default now()
);

create index if not exists creator_interactions_creator_at_idx
  on public.creator_interactions (creator_id, at desc);
create index if not exists creator_interactions_content_idx
  on public.creator_interactions (content_id);

alter table public.creator_interactions enable row level security;

drop policy if exists "creator_interactions_select" on public.creator_interactions;
create policy "creator_interactions_select" on public.creator_interactions
  for select using (
    auth.uid()::text = creator_id
    or auth.uid()::text = actor_id
  );

drop policy if exists "creator_interactions_insert" on public.creator_interactions;
create policy "creator_interactions_insert" on public.creator_interactions
  for insert with check (
    auth.uid()::text = actor_id
  );

drop policy if exists "creator_interactions_update" on public.creator_interactions;
create policy "creator_interactions_update" on public.creator_interactions
  for update using (
    auth.uid()::text = actor_id
  );
