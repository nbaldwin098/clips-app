-- Bucket "clips": size + MIME matching product (clip 60s / video 24h).
-- 2 GiB abuse ceiling (same as src/lib/mediaUpload.js MAX_UPLOAD_BYTES).
-- Images are capped at 12 MiB in the client; the bucket uses the video ceiling
-- so one policy covers videos/<uid>/ and pics/<uid>/.
--
-- Public read stays — getPublicUrl() playback needs it. Writes stay owner-folder.
-- Owner must run this in the SQL editor / Admin Setup after 0027.

insert into storage.buckets (id, name, public)
values ('clips', 'clips', true)
on conflict (id) do nothing;

update storage.buckets
set
  file_size_limit = 2147483648,
  allowed_mime_types = array[
    'video/mp4',
    'video/quicktime',
    'video/webm',
    'video/x-m4v',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif'
  ]
where id = 'clips';
