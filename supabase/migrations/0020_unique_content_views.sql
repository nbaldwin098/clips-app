-- Unique viewers (by viewer_key = user id or IP hash), not per-watch inflation.
-- Run after 0016. Safe to re-run.

alter table public.content_views
  add column if not exists viewer_key text,
  add column if not exists viewer_ip text;

-- Backfill viewer_key from actor_id where missing
update public.content_views
set viewer_key = actor_id
where viewer_key is null and actor_id is not null;

create unique index if not exists content_views_unique_viewer_idx
  on public.content_views (content_id, viewer_key)
  where viewer_key is not null;

-- Recount = distinct viewers, not insert spam
create or replace function public.bump_content_view_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  n bigint;
begin
  select count(distinct viewer_key) into n
  from public.content_views
  where content_id = new.content_id
    and viewer_key is not null;
  insert into public.content_view_counts (content_id, views, updated_at)
  values (new.content_id, coalesce(n, 0), now())
  on conflict (content_id) do update
    set views = excluded.views,
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists content_views_bump on public.content_views;
create trigger content_views_bump
  after insert on public.content_views
  for each row execute function public.bump_content_view_count();

-- One-shot recount for existing rows
insert into public.content_view_counts (content_id, views, updated_at)
select content_id, count(distinct viewer_key), now()
from public.content_views
where viewer_key is not null
group by content_id
on conflict (content_id) do update
  set views = excluded.views, updated_at = now();

-- Allow upsert updates for same viewer (idempotent re-watch)
drop policy if exists "content_views_update" on public.content_views;
create policy "content_views_update" on public.content_views for update
  using (auth.uid() is not null and (actor_id is null or auth.uid()::text = actor_id))
  with check (auth.uid() is not null and (actor_id is null or auth.uid()::text = actor_id));
