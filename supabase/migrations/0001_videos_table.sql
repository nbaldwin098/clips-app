-- Cross-device content catalog for Clips.
--
-- Without this table, uploaded videos/clips only ever lived in each
-- browser's localStorage, so nothing a creator published was ever visible
-- on a different device or to a different viewer. This table is the shared
-- source of truth; the client keeps a localStorage mirror for fast/offline
-- reads and syncs it against this table on load and after every publish.
--
-- Run this in the Supabase SQL editor (or via `supabase db push`) for the
-- project referenced by VITE_SUPABASE_URL.

create table if not exists public.videos (
  id text primary key,
  creator_id uuid references auth.users (id) on delete set null,
  handle text,
  type text not null default 'short',
  title text not null default 'Untitled',
  description text default '',
  source_url text,
  media_url text,
  thumb_url text,
  origin text,
  hosted boolean not null default false,
  stored_bytes bigint not null default 0,
  duration_sec numeric not null default 0,
  width integer,
  height integer,
  tags text[] not null default '{}',
  engagement jsonb not null default '{}'::jsonb,
  views bigint not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists videos_created_at_idx on public.videos (created_at desc);
create index if not exists videos_creator_id_idx on public.videos (creator_id);
create index if not exists videos_type_idx on public.videos (type);

alter table public.videos enable row level security;

-- Anyone (including anonymous viewers) can read the catalog.
drop policy if exists "Videos are viewable by everyone" on public.videos;
create policy "Videos are viewable by everyone"
  on public.videos for select
  using (true);

-- Only a signed-in Supabase user can publish, and only as themselves —
-- this is what prevents the generic "new row violates row-level security
-- policy" failure: creator_id must equal the caller's own auth.uid().
drop policy if exists "Users can insert their own videos" on public.videos;
create policy "Users can insert their own videos"
  on public.videos for insert
  with check (auth.uid() = creator_id);

drop policy if exists "Users can update their own videos" on public.videos;
create policy "Users can update their own videos"
  on public.videos for update
  using (auth.uid() = creator_id);

drop policy if exists "Users can delete their own videos" on public.videos;
create policy "Users can delete their own videos"
  on public.videos for delete
  using (auth.uid() = creator_id);
