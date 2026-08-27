-- Stripe Connect status + settlement / transfer ledgers (idempotent webhooks).
-- Apply after 0023. Safe to re-run.

alter table if exists public.profiles
  add column if not exists stripe_connect_account_id text,
  add column if not exists stripe_connect_charges_enabled boolean not null default false,
  add column if not exists stripe_connect_payouts_enabled boolean not null default false,
  add column if not exists stripe_connect_details_submitted boolean not null default false,
  add column if not exists stripe_connect_updated_at timestamptz;

create unique index if not exists profiles_stripe_connect_account_id_uidx
  on public.profiles (stripe_connect_account_id)
  where stripe_connect_account_id is not null;

-- One row per Checkout Session — webhook + client claim both check this.
create table if not exists public.stripe_settlements (
  session_id text primary key,
  kind text not null default '',
  payer_user_id text,
  creator_id text,
  amount_cents integer not null default 0,
  creator_share_cents integer not null default 0,
  platform_share_cents integer not null default 0,
  currency text not null default 'usd',
  status text not null default 'settled',
  transfer_id text,
  transfer_status text not null default 'none',
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists stripe_settlements_creator_idx
  on public.stripe_settlements (creator_id, created_at desc);

alter table public.stripe_settlements enable row level security;

drop policy if exists stripe_settlements_select_own on public.stripe_settlements;
create policy stripe_settlements_select_own
  on public.stripe_settlements for select
  using (
    auth.uid()::text = payer_user_id
    or auth.uid()::text = creator_id
  );

-- Transfer attempts (may retry when Connect becomes ready).
create table if not exists public.stripe_connect_transfers (
  id text primary key,
  session_id text references public.stripe_settlements (session_id) on delete set null,
  creator_id text not null,
  connect_account_id text not null,
  amount_cents integer not null,
  currency text not null default 'usd',
  stripe_transfer_id text,
  status text not null default 'pending',
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists stripe_connect_transfers_creator_idx
  on public.stripe_connect_transfers (creator_id, created_at desc);

alter table public.stripe_connect_transfers enable row level security;

drop policy if exists stripe_connect_transfers_select_own on public.stripe_connect_transfers;
create policy stripe_connect_transfers_select_own
  on public.stripe_connect_transfers for select
  using (auth.uid()::text = creator_id);

alter table if exists public.creator_earnings
  add column if not exists connect_paid_usd numeric(12,2) not null default 0;

-- Clients must not spoof Connect ids / flags (Edge Functions use service_role).
create or replace function public.guard_stripe_connect_cols()
returns trigger
language plpgsql
as $$
begin
  if auth.role() = 'authenticated' then
    if tg_op = 'UPDATE' then
      new.stripe_connect_account_id := old.stripe_connect_account_id;
      new.stripe_connect_charges_enabled := old.stripe_connect_charges_enabled;
      new.stripe_connect_payouts_enabled := old.stripe_connect_payouts_enabled;
      new.stripe_connect_details_submitted := old.stripe_connect_details_submitted;
      new.stripe_connect_updated_at := old.stripe_connect_updated_at;
    elsif tg_op = 'INSERT' then
      new.stripe_connect_account_id := null;
      new.stripe_connect_charges_enabled := false;
      new.stripe_connect_payouts_enabled := false;
      new.stripe_connect_details_submitted := false;
      new.stripe_connect_updated_at := null;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_stripe_connect on public.profiles;
create trigger profiles_guard_stripe_connect
  before insert or update on public.profiles
  for each row execute function public.guard_stripe_connect_cols();

