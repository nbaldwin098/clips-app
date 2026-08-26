-- Support tickets + marketplace (cloud source of truth).
-- Run after 0017. Never store tickets/orders only in the browser.

-- ——— Staff roles (owner / admin / cs / mod) ———
create table if not exists public.staff_roles (
  user_id text primary key,
  role text not null check (role in ('owner', 'admin', 'cs', 'mod')),
  label text not null default '',
  created_at timestamptz not null default now()
);
alter table public.staff_roles enable row level security;
drop policy if exists "staff_roles_select_auth" on public.staff_roles;
create policy "staff_roles_select_auth" on public.staff_roles for select
  using (auth.uid() is not null);
drop policy if exists "staff_roles_write_owner" on public.staff_roles;
create policy "staff_roles_write_owner" on public.staff_roles for all
  using (auth.uid()::text in (select user_id from public.staff_roles where role = 'owner'))
  with check (auth.uid()::text in (select user_id from public.staff_roles where role = 'owner'));

-- ——— Support tickets ———
create table if not exists public.support_tickets (
  id text primary key,
  user_id text not null,
  email text,
  handle text,
  subject text not null default '',
  body text not null default '',
  status text not null default 'open',
  priority text not null default 'normal',
  assignee_id text,
  category text not null default 'general',
  meta jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists support_tickets_status_idx on public.support_tickets (status, created_at desc);
create index if not exists support_tickets_user_idx on public.support_tickets (user_id, created_at desc);
alter table public.support_tickets enable row level security;
drop policy if exists "support_tickets_select" on public.support_tickets;
create policy "support_tickets_select" on public.support_tickets for select
  using (
    auth.uid()::text = user_id
    or auth.uid()::text in (select user_id from public.staff_roles)
  );
drop policy if exists "support_tickets_insert" on public.support_tickets;
create policy "support_tickets_insert" on public.support_tickets for insert
  with check (auth.uid()::text = user_id);
drop policy if exists "support_tickets_update" on public.support_tickets;
create policy "support_tickets_update" on public.support_tickets for update
  using (
    auth.uid()::text = user_id
    or auth.uid()::text in (select user_id from public.staff_roles)
  );

create table if not exists public.support_ticket_notes (
  id text primary key,
  ticket_id text not null references public.support_tickets(id) on delete cascade,
  author_id text not null,
  body text not null default '',
  internal boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.support_ticket_notes enable row level security;
drop policy if exists "support_notes_staff" on public.support_ticket_notes;
create policy "support_notes_staff" on public.support_ticket_notes for all
  using (auth.uid()::text in (select user_id from public.staff_roles))
  with check (auth.uid()::text in (select user_id from public.staff_roles));

-- ——— Marketplace sellers ———
create table if not exists public.marketplace_sellers (
  user_id text primary key,
  kind text not null default 'creator', -- user | creator | business
  status text not null default 'pending', -- pending | approved | rejected | suspended
  display_name text not null default '',
  bio text not null default '',
  payout_email text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.marketplace_sellers enable row level security;
drop policy if exists "marketplace_sellers_select" on public.marketplace_sellers;
create policy "marketplace_sellers_select" on public.marketplace_sellers for select using (true);
drop policy if exists "marketplace_sellers_upsert_own" on public.marketplace_sellers;
create policy "marketplace_sellers_upsert_own" on public.marketplace_sellers for insert
  with check (auth.uid()::text = user_id);
drop policy if exists "marketplace_sellers_update" on public.marketplace_sellers;
create policy "marketplace_sellers_update" on public.marketplace_sellers for update
  using (
    auth.uid()::text = user_id
    or auth.uid()::text in (select user_id from public.staff_roles)
  );

-- ——— Products ———
create table if not exists public.marketplace_products (
  id text primary key,
  seller_id text not null,
  title text not null,
  description text not null default '',
  kind text not null check (kind in ('physical', 'virtual')),
  price_cents int not null check (price_cents >= 0),
  shipping_cents int not null default 0 check (shipping_cents >= 0),
  currency text not null default 'usd',
  stock int,
  image_url text,
  active boolean not null default true,
  meta jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists marketplace_products_active_idx
  on public.marketplace_products (active, created_at desc);
create index if not exists marketplace_products_seller_idx
  on public.marketplace_products (seller_id, created_at desc);
alter table public.marketplace_products enable row level security;
drop policy if exists "marketplace_products_select" on public.marketplace_products;
create policy "marketplace_products_select" on public.marketplace_products for select
  using (active = true or auth.uid()::text = seller_id or auth.uid()::text in (select user_id from public.staff_roles));
drop policy if exists "marketplace_products_write" on public.marketplace_products;
create policy "marketplace_products_write" on public.marketplace_products for all
  using (auth.uid()::text = seller_id or auth.uid()::text in (select user_id from public.staff_roles))
  with check (auth.uid()::text = seller_id or auth.uid()::text in (select user_id from public.staff_roles));

-- ——— Orders + escrow ———
create table if not exists public.marketplace_orders (
  id text primary key,
  buyer_id text not null,
  seller_id text not null,
  product_id text not null,
  product_title text not null default '',
  kind text not null,
  subtotal_cents int not null,
  shipping_cents int not null default 0,
  platform_fee_cents int not null default 0,
  total_cents int not null,
  status text not null default 'pending_payment',
  -- pending_payment | paid | shipped | delivered | released | refunded | disputed
  tracking_number text,
  tracking_carrier text,
  shipped_at timestamptz,
  delivered_at timestamptz,
  release_at timestamptz,
  dispute_deadline timestamptz,
  stripe_session_id text,
  stripe_payment_link text,
  meta jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists marketplace_orders_buyer_idx on public.marketplace_orders (buyer_id, created_at desc);
create index if not exists marketplace_orders_seller_idx on public.marketplace_orders (seller_id, created_at desc);
create index if not exists marketplace_orders_status_idx on public.marketplace_orders (status, release_at);
alter table public.marketplace_orders enable row level security;
drop policy if exists "marketplace_orders_select" on public.marketplace_orders;
create policy "marketplace_orders_select" on public.marketplace_orders for select
  using (
    auth.uid()::text = buyer_id
    or auth.uid()::text = seller_id
    or auth.uid()::text in (select user_id from public.staff_roles)
  );
drop policy if exists "marketplace_orders_insert" on public.marketplace_orders;
create policy "marketplace_orders_insert" on public.marketplace_orders for insert
  with check (auth.uid()::text = buyer_id);
drop policy if exists "marketplace_orders_update" on public.marketplace_orders;
create policy "marketplace_orders_update" on public.marketplace_orders for update
  using (
    auth.uid()::text = buyer_id
    or auth.uid()::text = seller_id
    or auth.uid()::text in (select user_id from public.staff_roles)
  );
