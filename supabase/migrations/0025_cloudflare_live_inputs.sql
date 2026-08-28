-- One Cloudflare Stream live input per creator. Service role writes; owner can read own row.
create table if not exists public.cloudflare_live_inputs (
  user_id uuid primary key references auth.users (id) on delete cascade,
  live_input_id text not null,
  rtmps_url text not null,
  stream_key text not null,
  hls_url text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.cloudflare_live_inputs enable row level security;

drop policy if exists cloudflare_live_inputs_select_own on public.cloudflare_live_inputs;
create policy cloudflare_live_inputs_select_own
  on public.cloudflare_live_inputs for select
  using (auth.uid() = user_id);
