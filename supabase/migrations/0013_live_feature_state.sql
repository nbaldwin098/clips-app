-- Optional cloud mirror for live differentiators (pools, challenges, groups).
-- Safe to run after 0012. App keeps working with localStorage if this table is missing.

create table if not exists public.live_feature_state (
  id text primary key,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.live_feature_state enable row level security;

drop policy if exists "Anyone can read live feature state" on public.live_feature_state;
create policy "Anyone can read live feature state"
  on public.live_feature_state for select
  using (true);

drop policy if exists "Authenticated can upsert live feature state" on public.live_feature_state;
create policy "Authenticated can upsert live feature state"
  on public.live_feature_state for insert
  to authenticated
  with check (true);

drop policy if exists "Authenticated can update live feature state" on public.live_feature_state;
create policy "Authenticated can update live feature state"
  on public.live_feature_state for update
  to authenticated
  using (true)
  with check (true);
