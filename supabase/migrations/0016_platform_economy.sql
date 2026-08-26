-- Platform economy + engagement truth (cloud source of truth).
-- Calabi Cash, Gold Coins, creator earnings/withdrawals, premium subs,
-- content views, and votes → vote_tallies trigger.
-- Run after 0015 in Admin Setup / SQL editor.

-- ——— Vote tallies stay in sync with real votes ———
create or replace function public.sync_vote_tally()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cid text;
  up_n int;
  down_n int;
begin
  cid := coalesce(new.content_id, old.content_id);
  if cid is null then
    return coalesce(new, old);
  end if;
  select
    count(*) filter (where direction = 'up'),
    count(*) filter (where direction = 'down')
  into up_n, down_n
  from public.votes
  where content_id = cid;
  insert into public.vote_tallies (content_id, up, down)
  values (cid, coalesce(up_n, 0), coalesce(down_n, 0))
  on conflict (content_id) do update
    set up = excluded.up, down = excluded.down;
  return coalesce(new, old);
end;
$$;

drop trigger if exists votes_sync_tally on public.votes;
create trigger votes_sync_tally
  after insert or update or delete on public.votes
  for each row execute function public.sync_vote_tally();

-- Backfill tallies from existing votes
insert into public.vote_tallies (content_id, up, down)
select content_id,
  count(*) filter (where direction = 'up'),
  count(*) filter (where direction = 'down')
from public.votes
group by content_id
on conflict (content_id) do update
  set up = excluded.up, down = excluded.down;

-- ——— Content views (per actor, for bubble map + video stats) ———
create table if not exists public.content_views (
  id text primary key,
  content_id text not null,
  creator_id text not null,
  actor_id text,
  surface text not null default 'unknown',
  content_type text,
  created_at timestamptz not null default now()
);
create index if not exists content_views_content_idx on public.content_views (content_id, created_at desc);
create index if not exists content_views_creator_idx on public.content_views (creator_id, created_at desc);

alter table public.content_views enable row level security;
drop policy if exists "content_views_select" on public.content_views;
create policy "content_views_select" on public.content_views for select using (true);
drop policy if exists "content_views_insert" on public.content_views;
create policy "content_views_insert" on public.content_views for insert
  with check (auth.uid() is not null and (actor_id is null or auth.uid()::text = actor_id));

create table if not exists public.content_view_counts (
  content_id text primary key,
  views bigint not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.content_view_counts enable row level security;
drop policy if exists "content_view_counts_select" on public.content_view_counts;
create policy "content_view_counts_select" on public.content_view_counts for select using (true);

create or replace function public.bump_content_view_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.content_view_counts (content_id, views, updated_at)
  values (new.content_id, 1, now())
  on conflict (content_id) do update
    set views = public.content_view_counts.views + 1,
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists content_views_bump on public.content_views;
create trigger content_views_bump
  after insert on public.content_views
  for each row execute function public.bump_content_view_count();

-- ——— Premium memberships ———
create table if not exists public.premium_subs (
  user_id text not null,
  creator_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, creator_id)
);
create index if not exists premium_subs_creator_idx on public.premium_subs (creator_id);
alter table public.premium_subs enable row level security;
drop policy if exists "premium_subs_select" on public.premium_subs;
create policy "premium_subs_select" on public.premium_subs for select using (true);
drop policy if exists "premium_subs_insert" on public.premium_subs;
create policy "premium_subs_insert" on public.premium_subs for insert
  with check (auth.uid()::text = user_id);
drop policy if exists "premium_subs_delete" on public.premium_subs;
create policy "premium_subs_delete" on public.premium_subs for delete
  using (auth.uid()::text = user_id or auth.uid()::text = creator_id);

-- ——— Wallets: Calabi Cash + Gold Coins ———
create table if not exists public.wallets (
  user_id text primary key,
  cash_units bigint not null default 0 check (cash_units >= 0),
  coin_units bigint not null default 0 check (coin_units >= 0),
  first_buy_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.wallets enable row level security;
drop policy if exists "wallets_select_own" on public.wallets;
create policy "wallets_select_own" on public.wallets for select
  using (auth.uid()::text = user_id);
drop policy if exists "wallets_upsert_own" on public.wallets;
create policy "wallets_upsert_own" on public.wallets for insert
  with check (auth.uid()::text = user_id);
drop policy if exists "wallets_update_own" on public.wallets;
create policy "wallets_update_own" on public.wallets for update
  using (auth.uid()::text = user_id);

create table if not exists public.wallet_ledger (
  id text primary key,
  user_id text not null,
  kind text not null, -- cash_credit | cash_debit | coin_credit | coin_debit
  delta bigint not null,
  balance bigint not null,
  note text not null default '',
  meta jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists wallet_ledger_user_idx on public.wallet_ledger (user_id, created_at desc);
alter table public.wallet_ledger enable row level security;
drop policy if exists "wallet_ledger_select_own" on public.wallet_ledger;
create policy "wallet_ledger_select_own" on public.wallet_ledger for select
  using (auth.uid()::text = user_id);
drop policy if exists "wallet_ledger_insert_own" on public.wallet_ledger;
create policy "wallet_ledger_insert_own" on public.wallet_ledger for insert
  with check (auth.uid()::text = user_id);

-- ——— Creator earnings + withdrawals ———
create table if not exists public.creator_earnings (
  creator_id text primary key,
  available_usd numeric(12,2) not null default 0,
  pending_usd numeric(12,2) not null default 0,
  lifetime_usd numeric(12,2) not null default 0,
  tips_usd numeric(12,2) not null default 0,
  subs_usd numeric(12,2) not null default 0,
  packs_usd numeric(12,2) not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.creator_earnings enable row level security;
drop policy if exists "creator_earnings_select_own" on public.creator_earnings;
create policy "creator_earnings_select_own" on public.creator_earnings for select
  using (auth.uid()::text = creator_id);
drop policy if exists "creator_earnings_upsert_own" on public.creator_earnings;
create policy "creator_earnings_upsert_own" on public.creator_earnings for insert
  with check (auth.uid()::text = creator_id);
drop policy if exists "creator_earnings_update_own" on public.creator_earnings;
create policy "creator_earnings_update_own" on public.creator_earnings for update
  using (auth.uid()::text = creator_id);

create table if not exists public.creator_earnings_daily (
  creator_id text not null,
  day date not null,
  usd numeric(12,2) not null default 0,
  primary key (creator_id, day)
);
alter table public.creator_earnings_daily enable row level security;
drop policy if exists "creator_earnings_daily_select_own" on public.creator_earnings_daily;
create policy "creator_earnings_daily_select_own" on public.creator_earnings_daily for select
  using (auth.uid()::text = creator_id);
drop policy if exists "creator_earnings_daily_upsert_own" on public.creator_earnings_daily;
create policy "creator_earnings_daily_upsert_own" on public.creator_earnings_daily for insert
  with check (auth.uid()::text = creator_id);
drop policy if exists "creator_earnings_daily_update_own" on public.creator_earnings_daily;
create policy "creator_earnings_daily_update_own" on public.creator_earnings_daily for update
  using (auth.uid()::text = creator_id);

create table if not exists public.withdraw_methods (
  id text primary key,
  creator_id text not null,
  type text not null default 'paypal',
  label text not null default 'Payout method',
  details text not null default '',
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists withdraw_methods_creator_idx on public.withdraw_methods (creator_id);
alter table public.withdraw_methods enable row level security;
drop policy if exists "withdraw_methods_all_own" on public.withdraw_methods;
create policy "withdraw_methods_all_own" on public.withdraw_methods for all
  using (auth.uid()::text = creator_id)
  with check (auth.uid()::text = creator_id);

create table if not exists public.withdraw_requests (
  id text primary key,
  creator_id text not null,
  amount_usd numeric(12,2) not null,
  method_id text not null,
  method_label text not null default '',
  status text not null default 'pending',
  created_at timestamptz not null default now()
);
create index if not exists withdraw_requests_creator_idx on public.withdraw_requests (creator_id, created_at desc);
alter table public.withdraw_requests enable row level security;
drop policy if exists "withdraw_requests_select_own" on public.withdraw_requests;
create policy "withdraw_requests_select_own" on public.withdraw_requests for select
  using (auth.uid()::text = creator_id);
drop policy if exists "withdraw_requests_insert_own" on public.withdraw_requests;
create policy "withdraw_requests_insert_own" on public.withdraw_requests for insert
  with check (auth.uid()::text = creator_id);

-- ——— Stream settings + VODs (cloud, not device-local) ———
create table if not exists public.stream_settings (
  user_id text primary key,
  latency text not null default 'low',
  default_quality text not null default '720p30',
  stream_title_template text not null default '',
  store_past_broadcasts boolean not null default true,
  auto_publish_vod boolean not null default false,
  vod_visibility text not null default 'private',
  vod_channel_enabled boolean not null default false,
  vod_channel_handle text not null default '',
  updated_at timestamptz not null default now()
);
alter table public.stream_settings enable row level security;
drop policy if exists "stream_settings_all_own" on public.stream_settings;
create policy "stream_settings_all_own" on public.stream_settings for all
  using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

create table if not exists public.vods (
  id text primary key,
  user_id text not null,
  title text not null default 'Past broadcast',
  started_at timestamptz,
  ended_at timestamptz,
  duration_sec int not null default 0,
  visibility text not null default 'private',
  category text,
  meta jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists vods_user_idx on public.vods (user_id, ended_at desc);
alter table public.vods enable row level security;
drop policy if exists "vods_select" on public.vods;
create policy "vods_select" on public.vods for select
  using (visibility = 'public' or auth.uid()::text = user_id);
drop policy if exists "vods_write_own" on public.vods;
create policy "vods_write_own" on public.vods for all
  using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

-- Creators must see all interaction rows aimed at them (already in 0014).
-- Also let creators read tallies for their content via public selects above.
