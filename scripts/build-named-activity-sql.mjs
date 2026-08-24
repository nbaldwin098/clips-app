/**
 * Builds supabase/migrations/0009_named_activity.sql from namedAccounts.csv
 */
import { readFileSync, writeFileSync } from 'node:fs'

const csv = readFileSync(new URL('../src/data/namedAccounts.csv', import.meta.url), 'utf8')
const people = []
for (const line of csv.trim().split(/\n/).slice(1)) {
  const [id, first, last, full] = line.split(',')
  const n = Number(id)
  const handle = `${String(first || '').toLowerCase()}${String(last || '').toLowerCase()}${n}`.replace(/[^a-z0-9]/g, '').slice(0, 24)
  people.push({
    n,
    id: `named-${String(n).padStart(4, '0')}`,
    email: `name${n}@calabi.com`,
    name: String(full || '').replace(/'/g, "''"),
    handle,
  })
}

const inserts = people.map((p) =>
  `  (${p.n}, '${p.id}', '${p.email}', '${p.name}', '${p.handle}')`
).join(',\n')

const sql = `-- Named people accounts + a Supabase job that keeps using the catalog.
-- Copy this whole file into SQL Editor and Run. Do not type the file name.
-- Likes stay up. No comments. No live chat.
-- If the cron lines at the bottom fail: Database → Extensions → enable pg_cron, then run only those last lines again.

create table if not exists public.named_people (
  n int primary key,
  id text not null unique,
  email text not null unique,
  display_name text not null,
  handle text not null
);

create table if not exists public.named_activity_state (
  id int primary key,
  cursor bigint not null default 0
);
insert into public.named_activity_state (id, cursor) values (1, 0)
on conflict (id) do nothing;

create table if not exists public.named_watches (
  user_id text not null,
  content_id text not null,
  watched_at timestamptz not null default now(),
  primary key (user_id, content_id)
);

create table if not exists public.vote_tallies (
  content_id text primary key,
  up bigint not null default 0,
  down bigint not null default 0
);

create table if not exists public.live_lobby (
  user_id text primary key,
  is_live boolean not null default true,
  title text,
  handle text,
  display_name text,
  category text,
  started_at timestamptz,
  watcher_ids text[] not null default '{}'
);

insert into public.named_people (n, id, email, display_name, handle) values
${inserts}
on conflict (n) do update set
  id = excluded.id,
  email = excluded.email,
  display_name = excluded.display_name,
  handle = excluded.handle;

alter table public.vote_tallies enable row level security;
alter table public.live_lobby enable row level security;
alter table public.named_people enable row level security;
alter table public.named_watches enable row level security;
alter table public.named_activity_state enable row level security;

drop policy if exists "vote_tallies_select" on public.vote_tallies;
create policy "vote_tallies_select" on public.vote_tallies for select using (true);

drop policy if exists "live_lobby_select" on public.live_lobby;
create policy "live_lobby_select" on public.live_lobby for select using (true);
drop policy if exists "live_lobby_upsert" on public.live_lobby;
create policy "live_lobby_upsert" on public.live_lobby for insert
  with check (auth.uid()::text = user_id);
drop policy if exists "live_lobby_update" on public.live_lobby;
create policy "live_lobby_update" on public.live_lobby for update
  using (auth.uid()::text = user_id);
drop policy if exists "live_lobby_delete" on public.live_lobby;
create policy "live_lobby_delete" on public.live_lobby for delete
  using (auth.uid()::text = user_id);

drop policy if exists "named_people_select" on public.named_people;
create policy "named_people_select" on public.named_people for select using (true);

create or replace function public.upsert_library_video(payload jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  vid text;
begin
  vid := payload->>'id';
  if vid is null or vid not like 'org-%' then
    raise exception 'library videos must use an org- id';
  end if;
  insert into public.videos (
    id, creator_id, handle, type, title, description,
    source_url, media_url, thumb_url, origin, hosted,
    duration_sec, tags, views, created_at
  ) values (
    vid,
    null,
    payload->>'handle',
    coalesce(nullif(payload->>'type', ''), 'video'),
    coalesce(nullif(payload->>'title', ''), 'Untitled'),
    coalesce(payload->>'description', ''),
    payload->>'source_url',
    payload->>'media_url',
    payload->>'thumb_url',
    coalesce(payload->>'origin', 'public-domain-org'),
    true,
    coalesce((payload->>'duration_sec')::numeric, 0),
    case
      when jsonb_typeof(payload->'tags') = 'array' then array(select jsonb_array_elements_text(payload->'tags'))
      else '{}'::text[]
    end,
    coalesce((payload->>'views')::bigint, 0),
    coalesce((payload->>'created_at')::timestamptz, now())
  )
  on conflict (id) do update set
    handle = excluded.handle,
    type = excluded.type,
    title = excluded.title,
    description = excluded.description,
    source_url = excluded.source_url,
    media_url = excluded.media_url,
    thumb_url = excluded.thumb_url,
    duration_sec = excluded.duration_sec,
    tags = excluded.tags;
end;
$$;

revoke all on function public.upsert_library_video(jsonb) from public;
grant execute on function public.upsert_library_video(jsonb) to anon, authenticated;

create or replace function public.run_named_activity(batch integer default 40)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n_people int;
  n_videos int;
  cur bigint;
  i int;
  pid text;
  cid text;
  vtype text;
  liked int;
  watched int;
begin
  if batch is null or batch < 1 then batch := 40; end if;
  if batch > 200 then batch := 200; end if;

  select count(*) into n_people from public.named_people;
  select count(*) into n_videos from public.videos;
  if n_people < 1 then return 0; end if;

  insert into public.named_activity_state (id, cursor) values (1, 0)
  on conflict (id) do nothing;
  select cursor into cur from public.named_activity_state where id = 1;

  for i in 1..batch loop
    select id into pid from public.named_people order by n offset (cur % n_people) limit 1;

    if n_videos > 0 then
      select id, type into cid, vtype
      from public.videos
      order by id
      offset ((cur / n_people) % n_videos)
      limit 1;

      insert into public.votes (user_id, content_id, direction)
      values (pid, cid, 'up')
      on conflict (user_id, content_id) do nothing;
      get diagnostics liked = row_count;
      if liked > 0 then
        insert into public.vote_tallies (content_id, up, down)
        values (cid, 1, 0)
        on conflict (content_id) do update set up = public.vote_tallies.up + 1;
        update public.videos
        set engagement = jsonb_set(
          coalesce(engagement, '{}'::jsonb),
          '{likes}',
          to_jsonb(coalesce((engagement->>'likes')::int, 0) + 1)
        )
        where id = cid;
      end if;

      insert into public.named_watches (user_id, content_id)
      values (pid, cid)
      on conflict (user_id, content_id) do nothing;
      get diagnostics watched = row_count;
      if watched > 0 then
        if vtype = 'short' then
          update public.videos
          set
            views = views + 1,
            engagement = jsonb_set(
              coalesce(engagement, '{}'::jsonb),
              '{loops}',
              to_jsonb(coalesce((engagement->>'loops')::int, 0) + 1)
            )
          where id = cid;
        else
          update public.videos
          set
            views = views + 1,
            engagement = jsonb_set(
              coalesce(engagement, '{}'::jsonb),
              '{completes}',
              to_jsonb(coalesce((engagement->>'completes')::int, 0) + 1)
            )
          where id = cid;
        end if;
      end if;
    end if;

    update public.live_lobby
    set watcher_ids = case
      when watcher_ids @> array[pid]::text[] then watcher_ids
      else array_append(watcher_ids, pid)
    end
    where is_live = true;

    cur := cur + 1;
  end loop;

  update public.named_activity_state set cursor = cur where id = 1;
  return batch;
end;
$$;

revoke all on function public.run_named_activity(integer) from public;

do $cron$
begin
  begin
    create extension if not exists pg_cron;
  exception when others then
    raise notice 'Turn on pg_cron under Database → Extensions, then re-run the schedule lines.';
  end;
  begin
    perform cron.unschedule('clips-named-activity');
  exception when others then
    null;
  end;
  begin
    perform cron.schedule('clips-named-activity', '15 seconds', 'select public.run_named_activity(40)');
  exception when others then
    raise notice 'pg_cron schedule failed. Enable the extension and run: select cron.schedule(''clips-named-activity'', ''15 seconds'', ''select public.run_named_activity(40)'');';
  end;
end
$cron$;
`

writeFileSync(new URL('../supabase/migrations/0009_named_activity.sql', import.meta.url), sql)
console.log('wrote 0009 with', people.length, 'people')
