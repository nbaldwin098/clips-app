-- Delete leftover sample / unplayable catalog rows.
-- Copy this whole script. Do not type the file name.

delete from public.videos
where coalesce(origin, '') = 'reference'
   or id like 'ref-short-%'
   or id like 'ref-%';

delete from public.videos
where coalesce(media_url, '') ~* 'picsum\\.photos|placekitten|loremflickr|via\\.placeholder|sample-videos\\.com|test-videos\\.co\\.uk|commondatastorage\\.googleapis\\.com/gtv'
   or coalesce(source_url, '') ~* 'picsum\\.photos|placekitten|loremflickr|via\\.placeholder|sample-videos\\.com|test-videos\\.co\\.uk'
   or coalesce(thumb_url, '') ~* 'picsum\\.photos|placekitten|loremflickr';

delete from public.videos
where type = 'pic'
  and coalesce(media_url, '') !~* '^https?://'
  and coalesce(source_url, '') !~* '^https?://'
  and coalesce(thumb_url, '') !~* '^https?://';

delete from public.videos
where type in ('video', 'short')
  and coalesce(media_url, '') !~* '^https?://'
  and coalesce(source_url, '') !~* '^https?://';
