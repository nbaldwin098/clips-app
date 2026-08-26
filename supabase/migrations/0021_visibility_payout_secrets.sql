-- Visibility on catalog + secure payout secrets (RLS: creator-only).
-- Run after 0020 in Admin Setup / SQL editor.

alter table if exists public.videos
  add column if not exists visibility text not null default 'public';

alter table if exists public.videos
  drop constraint if exists videos_visibility_check;

alter table if exists public.videos
  add constraint videos_visibility_check
  check (visibility in ('public', 'unlisted', 'private'));

create index if not exists videos_visibility_idx on public.videos (visibility);

comment on column public.videos.visibility is
  'public = feeds+profile; unlisted = link-only; private = owner library only';

-- Full bank/crypto secrets. Client writes only its own rows. Never select for other users.
create table if not exists public.payout_secrets (
  method_id text primary key,
  creator_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('bank', 'crypto', 'paypal')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payout_secrets_creator_idx on public.payout_secrets (creator_id);

alter table public.payout_secrets enable row level security;

drop policy if exists payout_secrets_own on public.payout_secrets;
create policy payout_secrets_own on public.payout_secrets
  for all
  using (auth.uid() = creator_id)
  with check (auth.uid() = creator_id);

-- Optional: keep withdraw_methods.details masked; secrets live here.
comment on table public.payout_secrets is
  'Sensitive payout destinations (routing/account/crypto address). Creator RLS only.';
