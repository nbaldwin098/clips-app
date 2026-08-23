-- Remove pics that cannot load and leftover sample clips.
-- Safe to run more than once. Does not delete a pic that has an http(s) image.

delete from public.videos
where type = 'pic'
  and coalesce(media_url, '') !~* '^https?://'
  and coalesce(source_url, '') !~* '^https?://'
  and coalesce(thumb_url, '') !~* '^https?://';

delete from public.videos
where id like 'ref-short-%'
   or coalesce(origin, '') = 'reference';
