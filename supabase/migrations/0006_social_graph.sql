-- Cross-device social graph: follows, votes, comments, playlists, notifications.
-- Local writes still happen first. src/lib/graphSync.js pushes/pulls when the
-- viewer is a real Supabase user. Run this in the SQL editor after 0005.

create table if not exists public.follows (
  follower_id text not null,
  creator_id text not null,
  created_at timestamptz not null default now(),
  primary key (follower_id, creator_id)
);
create index if not exists follows_creator_idx on public.follows (creator_id);

create table if not exists public.votes (
  user_id text not null,
  content_id text not null,
  direction text not null check (direction in ('up', 'down')),
  created_at timestamptz not null default now(),
  primary key (user_id, content_id)
);
create index if not exists votes_content_idx on public.votes (content_id);

create table if not exists public.comments (
  id text primary key,
  content_id text not null,
  user_id text not null,
  handle text,
  body text not null default '',
  parent_id text,
  likes int not null default 0,
  liked_by jsonb not null default '[]',
  pinned boolean not null default false,
  hearted boolean not null default false,
  held boolean not null default false,
  deleted boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists comments_content_idx on public.comments (content_id);

create table if not exists public.playlists (
  id text primary key,
  user_id text not null,
  title text not null default 'Playlist',
  visibility text not null default 'public',
  items jsonb not null default '[]',
  created_at timestamptz not null default now()
);
create index if not exists playlists_user_idx on public.playlists (user_id);

create table if not exists public.notifications (
  id text primary key,
  user_id text not null,
  type text,
  title text,
  body text,
  actor_id text,
  content_id text,
  view text,
  meta jsonb not null default '{}',
  read boolean not null default false,
  at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id, at desc);

alter table public.follows enable row level security;
alter table public.votes enable row level security;
alter table public.comments enable row level security;
alter table public.playlists enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "follows_select" on public.follows;
create policy "follows_select" on public.follows for select using (true);
drop policy if exists "follows_insert" on public.follows;
create policy "follows_insert" on public.follows for insert
  with check (auth.uid()::text = follower_id);
drop policy if exists "follows_delete" on public.follows;
create policy "follows_delete" on public.follows for delete
  using (auth.uid()::text = follower_id);
drop policy if exists "follows_update" on public.follows;
create policy "follows_update" on public.follows for update
  using (auth.uid()::text = follower_id);

drop policy if exists "votes_select" on public.votes;
create policy "votes_select" on public.votes for select using (true);
drop policy if exists "votes_upsert" on public.votes;
create policy "votes_upsert" on public.votes for insert
  with check (auth.uid()::text = user_id);
drop policy if exists "votes_update" on public.votes;
create policy "votes_update" on public.votes for update
  using (auth.uid()::text = user_id);
drop policy if exists "votes_delete" on public.votes;
create policy "votes_delete" on public.votes for delete
  using (auth.uid()::text = user_id);

drop policy if exists "comments_select" on public.comments;
create policy "comments_select" on public.comments for select using (true);
drop policy if exists "comments_insert" on public.comments;
create policy "comments_insert" on public.comments for insert
  with check (auth.uid()::text = user_id);
drop policy if exists "comments_update" on public.comments;
create policy "comments_update" on public.comments for update
  using (auth.uid()::text = user_id);

drop policy if exists "playlists_select" on public.playlists;
create policy "playlists_select" on public.playlists for select
  using (visibility = 'public' or auth.uid()::text = user_id);
drop policy if exists "playlists_insert" on public.playlists;
create policy "playlists_insert" on public.playlists for insert
  with check (auth.uid()::text = user_id);
drop policy if exists "playlists_update" on public.playlists;
create policy "playlists_update" on public.playlists for update
  using (auth.uid()::text = user_id);
drop policy if exists "playlists_delete" on public.playlists;
create policy "playlists_delete" on public.playlists for delete
  using (auth.uid()::text = user_id);

drop policy if exists "notifications_select" on public.notifications;
create policy "notifications_select" on public.notifications for select
  using (auth.uid()::text = user_id);
drop policy if exists "notifications_insert" on public.notifications;
create policy "notifications_insert" on public.notifications for insert
  with check (auth.uid() is not null);
drop policy if exists "notifications_update" on public.notifications;
create policy "notifications_update" on public.notifications for update
  using (auth.uid()::text = user_id);
