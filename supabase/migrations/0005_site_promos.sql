-- Site-wide banners / promotions. Public can read published rows.
-- Only a profiles.role = 'admin' account can write.
-- Run in the Supabase SQL editor after 0004_profiles.sql.

create table if not exists public.site_promos (
  id text primary key,
  preset_id text,
  headline text not null default '',
  body text default '',
  cta_label text default 'Open',
  dest_view text default 'home',
  dest_id text default '',
  feature_content_id text default '',
  placement text not null default 'banner',
  published boolean not null default false,
  starts_at timestamptz,
  ends_at timestamptz,
  clicks bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists site_promos_published_idx on public.site_promos (published, updated_at desc);

alter table public.site_promos enable row level security;

drop policy if exists "Published promos are viewable by everyone" on public.site_promos;
create policy "Published promos are viewable by everyone"
  on public.site_promos for select
  using (
    published = true
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "Admins can insert promos" on public.site_promos;
create policy "Admins can insert promos"
  on public.site_promos for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "Admins can update promos" on public.site_promos;
create policy "Admins can update promos"
  on public.site_promos for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "Admins can delete promos" on public.site_promos;
create policy "Admins can delete promos"
  on public.site_promos for delete
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );
