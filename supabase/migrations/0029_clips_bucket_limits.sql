-- Match client upload limits: 2 GiB abuse ceiling (mediaUpload.MAX_UPLOAD_BYTES).
-- Duration (60s clip / 24h video) stays client-enforced; storage cannot see duration.
-- MIME allowlist covers iPhone MP4/QuickTime plus web/video/photo uploads.
-- Numbered 0029 because 0028 is the videos RLS storage audit.

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
