-- Viewer ad preference (cloud, not localStorage) + live chat messages.

alter table public.profiles
  add column if not exists show_ads boolean not null default true;

comment on column public.profiles.show_ads is
  'When false, this signed-in viewer opted out of seeing ads on calabi.';

create table if not exists public.live_chat_messages (
  id text primary key,
  channel_id uuid not null references public.profiles (id) on delete cascade,
  user_id text not null,
  handle text default '',
  body text not null default '',
  kind text not null default 'chat',
  amount numeric,
  created_at timestamptz not null default now()
);

create index if not exists live_chat_messages_channel_created_idx
  on public.live_chat_messages (channel_id, created_at desc);

alter table public.live_chat_messages enable row level security;

drop policy if exists "Live chat is readable by everyone" on public.live_chat_messages;
create policy "Live chat is readable by everyone"
  on public.live_chat_messages for select
  using (true);

drop policy if exists "Signed-in users can post live chat" on public.live_chat_messages;
create policy "Signed-in users can post live chat"
  on public.live_chat_messages for insert
  with check (auth.uid() is not null);

drop policy if exists "Channel owner can delete live chat" on public.live_chat_messages;
create policy "Channel owner can delete live chat"
  on public.live_chat_messages for delete
  using (auth.uid() = channel_id);
