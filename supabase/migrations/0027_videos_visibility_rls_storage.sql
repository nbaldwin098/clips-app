-- Tighten catalog read + re-assert clips storage policies.
-- Private rows are owner-only. Unlisted stays link-reachable (select allowed).
-- Public read on storage.objects is required for getPublicUrl() playback.

alter table if exists public.videos enable row level security;

drop policy if exists "Videos are viewable by everyone" on public.videos;
drop policy if exists "Public videos are viewable" on public.videos;
create policy "Public videos are viewable"
  on public.videos for select
  using (
    coalesce(visibility, 'public') <> 'private'
    or auth.uid() = creator_id
  );

insert into storage.buckets (id, name, public)
values ('clips', 'clips', true)
on conflict (id) do nothing;

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
    and (storage.foldername(name))[2] = auth.uid()::text
  );

drop policy if exists "Users can delete their own uploaded files" on storage.objects;
create policy "Users can delete their own uploaded files"
  on storage.objects for delete
  using (
    bucket_id = 'clips'
    and (storage.foldername(name))[2] = auth.uid()::text
  );
