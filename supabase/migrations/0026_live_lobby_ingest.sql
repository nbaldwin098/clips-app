-- Extra live lobby columns so other devices get HLS, not just a name.
alter table if exists public.live_lobby add column if not exists hls_url text;
alter table if exists public.live_lobby add column if not exists ingest_connected boolean default false;
alter table if exists public.live_lobby add column if not exists provider text;
alter table if exists public.live_lobby add column if not exists rtmps_url text;
