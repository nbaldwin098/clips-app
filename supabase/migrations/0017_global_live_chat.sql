-- Global live lobby chat (before focusing a creator stream).
-- channel_id is a stable room key (not a profile uuid).

create table if not exists public.global_live_chat (
  id text primary key,
  room_id text not null default 'lobby',
  user_id text not null,
  handle text,
  body text not null default '',
  kind text not null default 'chat',
  amount numeric,
  created_at timestamptz not null default now()
);
create index if not exists global_live_chat_room_idx
  on public.global_live_chat (room_id, created_at desc);

alter table public.global_live_chat enable row level security;
drop policy if exists "global_live_chat_select" on public.global_live_chat;
create policy "global_live_chat_select" on public.global_live_chat for select using (true);
drop policy if exists "global_live_chat_insert" on public.global_live_chat;
create policy "global_live_chat_insert" on public.global_live_chat for insert
  with check (auth.uid() is not null and auth.uid()::text = user_id);
drop policy if exists "global_live_chat_delete" on public.global_live_chat;
create policy "global_live_chat_delete" on public.global_live_chat for delete
  using (auth.uid()::text = user_id);
