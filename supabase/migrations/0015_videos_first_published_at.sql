-- Immutable first-publish timestamp for posts.
-- created_at and first_published_at must never move forward on edits/re-uploads.
-- Run in the Supabase SQL editor after 0014.

alter table public.videos
  add column if not exists first_published_at timestamptz;

-- Backfill from the earliest known publish signal.
update public.videos
set first_published_at = coalesce(published_at, created_at)
where first_published_at is null
  and (status is null or status = 'published' or published_at is not null);

create index if not exists videos_first_published_at_idx
  on public.videos (first_published_at desc nulls last);

create or replace function public.videos_preserve_posted_times()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' then
    -- Never rewrite the original insert clock.
    new.created_at := old.created_at;

    if old.first_published_at is not null then
      new.first_published_at := old.first_published_at;
    elsif new.first_published_at is null
      and (
        coalesce(new.status, 'published') = 'published'
        or new.published_at is not null
      )
    then
      new.first_published_at := coalesce(new.published_at, old.published_at, new.created_at, now());
    end if;
  elsif tg_op = 'INSERT' then
    if new.first_published_at is null
      and (
        coalesce(new.status, 'published') = 'published'
        or new.published_at is not null
      )
    then
      new.first_published_at := coalesce(new.published_at, new.created_at, now());
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists videos_preserve_posted_times on public.videos;
create trigger videos_preserve_posted_times
  before insert or update on public.videos
  for each row execute function public.videos_preserve_posted_times();
