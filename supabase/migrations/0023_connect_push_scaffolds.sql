-- Optional columns / tables for free infra scaffolds (Connect + Web Push).
-- Safe to re-run. Apply via Admin Setup / SQL editor when ready.

alter table if exists public.profiles
  add column if not exists stripe_connect_account_id text;

create table if not exists public.push_subscriptions (
  endpoint text primary key,
  user_id uuid references auth.users (id) on delete cascade,
  subscription jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

-- Service role writes from Edge Functions; users can read their own rows.
drop policy if exists push_subscriptions_select_own on public.push_subscriptions;
create policy push_subscriptions_select_own
  on public.push_subscriptions for select
  using (auth.uid() = user_id);
