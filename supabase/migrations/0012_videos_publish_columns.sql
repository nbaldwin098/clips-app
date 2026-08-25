-- Publish/scheduling columns referenced by contentSync.toRow() but missing from 0001.
-- Without these, catalog upsert fails after storage upload and users see "Couldn't upload."

alter table public.videos
  add column if not exists published_at timestamptz,
  add column if not exists status text not null default 'published',
  add column if not exists scheduled_for timestamptz,
  add column if not exists price_usd numeric not null default 0;

create index if not exists videos_status_idx on public.videos (status);
create index if not exists videos_published_at_idx on public.videos (published_at desc nulls last);
