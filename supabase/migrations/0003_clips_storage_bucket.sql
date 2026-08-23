-- Storage bucket for hosted video/photo uploads.
--
-- src/lib/mediaUpload.js uploads to a bucket literally named "clips", at
-- paths like videos/<uid>/<file> and pics/<uid>/<file>, then calls
-- getPublicUrl() on the result — which only returns a working URL if the
-- bucket is public. Without this bucket (and its policies) existing,
-- uploadVideoToSupabase/uploadImageToSupabase fail and every upload falls
-- back to the local-only zero-storage link (by design — the app never
-- surfaces the raw failure to the viewer, it just quietly stays local).
--
-- Run this in the Supabase SQL editor (or via `supabase db push`) for the
-- project referenced by VITE_SUPABASE_URL.

insert into storage.buckets (id, name, public)
values ('clips', 'clips', true)
on conflict (id) do nothing;

-- Public read for every file in the bucket (required for getPublicUrl()
-- to return a URL that actually loads in a viewer's browser).
drop policy if exists "Public read access to clips bucket" on storage.objects;
create policy "Public read access to clips bucket"
  on storage.objects for select
  using (bucket_id = 'clips');

-- A signed-in user may only upload into their own uid-prefixed folder,
-- e.g. videos/<their-uid>/... or pics/<their-uid>/... — matches the path
-- shape mediaUpload.js builds.
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
