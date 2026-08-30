-- BUG-048: re-assert videos + clips storage RLS after bucket recreate.
-- Holes found in 0001 / 0027:
--   1. UPDATE on videos had USING but no WITH CHECK (owner could change creator_id).
--   2. Admin/CS delete of another creator's row was blocked by owner-only DELETE.
--   3. Unlisted rows were listed to every anon client (visibility <> private).
--   4. Storage UPDATE/DELETE lacked WITH CHECK; admin could not remove objects.
-- Public HTTP playback still uses a public `clips` bucket (getPublicUrl).

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

revoke all on function public.is_platform_admin() from public;
grant execute on function public.is_platform_admin() to anon, authenticated;

-- Unlisted is link-reachable via this RPC (exact id), not via list/select *.
create or replace function public.get_video_by_id(p_id text)
returns setof public.videos
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.videos v
  where v.id = p_id
    and (
      coalesce(v.visibility, 'public') in ('public', 'unlisted')
      or v.creator_id = auth.uid()
      or public.is_platform_admin()
    );
$$;

revoke all on function public.get_video_by_id(text) from public;
grant execute on function public.get_video_by_id(text) to anon, authenticated;

alter table if exists public.videos enable row level security;

drop policy if exists "Videos are viewable by everyone" on public.videos;
drop policy if exists "Public videos are viewable" on public.videos;
create policy "Public videos are viewable"
  on public.videos for select
  using (
    coalesce(visibility, 'public') = 'public'
    or auth.uid() = creator_id
    or public.is_platform_admin()
  );

drop policy if exists "Users can insert their own videos" on public.videos;
create policy "Users can insert their own videos"
  on public.videos for insert
  with check (auth.uid() = creator_id);

drop policy if exists "Users can update their own videos" on public.videos;
create policy "Users can update their own videos"
  on public.videos for update
  using (auth.uid() = creator_id or public.is_platform_admin())
  with check (auth.uid() = creator_id or public.is_platform_admin());

drop policy if exists "Users can delete their own videos" on public.videos;
drop policy if exists "Admins can delete videos" on public.videos;
create policy "Users can delete their own videos"
  on public.videos for delete
  using (auth.uid() = creator_id or public.is_platform_admin());

insert into storage.buckets (id, name, public)
values ('clips', 'clips', true)
on conflict (id) do update set public = true;

-- Public SELECT kept so getPublicUrl() + Storage API reads still work after
-- a bucket recreate. Writes stay uid-folder scoped.
drop policy if exists "Public read access to clips bucket" on storage.objects;
create policy "Public read access to clips bucket"
  on storage.objects for select
  using (bucket_id = 'clips');

drop policy if exists "Users can upload to their own folder" on storage.objects;
create policy "Users can upload to their own folder"
  on storage.objects for insert
  with check (
    bucket_id = 'clips'
    and auth.uid() is not null
    and (storage.foldername(name))[2] = auth.uid()::text
  );

drop policy if exists "Users can manage their own uploaded files" on storage.objects;
create policy "Users can manage their own uploaded files"
  on storage.objects for update
  using (
    bucket_id = 'clips'
    and (
      (storage.foldername(name))[2] = auth.uid()::text
      or public.is_platform_admin()
    )
  )
  with check (
    bucket_id = 'clips'
    and (
      (storage.foldername(name))[2] = auth.uid()::text
      or public.is_platform_admin()
    )
  );

drop policy if exists "Users can delete their own uploaded files" on storage.objects;
create policy "Users can delete their own uploaded files"
  on storage.objects for delete
  using (
    bucket_id = 'clips'
    and (
      (storage.foldername(name))[2] = auth.uid()::text
      or public.is_platform_admin()
    )
  );
