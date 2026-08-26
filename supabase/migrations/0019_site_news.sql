-- Platform News feed (left-menu News tab). Public can read published rows.
-- Admins write. Run after profiles exist (role = 'admin').

create table if not exists public.site_news (
  id text primary key,
  title text not null default '',
  body text not null default '',
  tag text default 'Update',
  dest_view text default '',
  dest_id text default '',
  cta_label text default '',
  published boolean not null default false,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists site_news_published_idx
  on public.site_news (published, published_at desc);

alter table public.site_news enable row level security;

drop policy if exists "Published news are viewable by everyone" on public.site_news;
create policy "Published news are viewable by everyone"
  on public.site_news for select
  using (
    published = true
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "Admins can insert news" on public.site_news;
create policy "Admins can insert news"
  on public.site_news for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "Admins can update news" on public.site_news;
create policy "Admins can update news"
  on public.site_news for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "Admins can delete news" on public.site_news;
create policy "Admins can delete news"
  on public.site_news for delete
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );
