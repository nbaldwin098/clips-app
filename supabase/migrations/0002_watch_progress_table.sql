-- Cross-device watch history/progress for Clips.
--
-- src/lib/watchProgress.js already reads/writes this table when Supabase is
-- configured and the viewer is signed in (falls back to local-only history
-- otherwise). This table was referenced by that code but never had a
-- migration checked in — if it doesn't exist yet, every write/read against
-- it silently fails (by design, so it never surfaces a raw DB error to a
-- viewer) and watch history quietly stays local-only.
--
-- Run this in the Supabase SQL editor (or via `supabase db push`) for the
-- project referenced by VITE_SUPABASE_URL.

create table if not exists public.watch_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  content_id text not null,
  title text,
  source_url text,
  watch_ratio numeric not null default 0,
  last_ratio numeric not null default 0,
  position_sec numeric not null default 0,
  duration_sec numeric not null default 0,
  completed boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, content_id)
);

create index if not exists watch_progress_user_id_idx on public.watch_progress (user_id);

alter table public.watch_progress enable row level security;

-- Watch history is private — only the owning user can read or write their own rows.
drop policy if exists "Users can view their own watch progress" on public.watch_progress;
create policy "Users can view their own watch progress"
  on public.watch_progress for select
  using (auth.uid() = user_id);

drop policy if exists "Users can upsert their own watch progress" on public.watch_progress;
create policy "Users can upsert their own watch progress"
  on public.watch_progress for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own watch progress" on public.watch_progress;
create policy "Users can update their own watch progress"
  on public.watch_progress for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete their own watch progress" on public.watch_progress;
create policy "Users can delete their own watch progress"
  on public.watch_progress for delete
  using (auth.uid() = user_id);
