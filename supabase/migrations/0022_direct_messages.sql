-- Secure direct messages (participants-only RLS).
-- Run after 0021 in Admin Setup / SQL editor.

create table if not exists public.dm_threads (
  id text primary key,
  user_low text not null,
  user_high text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dm_threads_ordered check (user_low < user_high),
  constraint dm_threads_pair unique (user_low, user_high)
);

create index if not exists dm_threads_user_low_idx on public.dm_threads (user_low, updated_at desc);
create index if not exists dm_threads_user_high_idx on public.dm_threads (user_high, updated_at desc);

create table if not exists public.dm_messages (
  id text primary key,
  thread_id text not null references public.dm_threads(id) on delete cascade,
  sender_id text not null,
  body text not null check (char_length(body) > 0 and char_length(body) <= 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists dm_messages_thread_created_idx
  on public.dm_messages (thread_id, created_at asc);

alter table public.dm_threads enable row level security;
alter table public.dm_messages enable row level security;

-- Only the two participants may see or touch a thread.
drop policy if exists dm_threads_select_own on public.dm_threads;
create policy dm_threads_select_own on public.dm_threads
  for select
  using (auth.uid()::text = user_low or auth.uid()::text = user_high);

drop policy if exists dm_threads_insert_own on public.dm_threads;
create policy dm_threads_insert_own on public.dm_threads
  for insert
  with check (
    auth.uid()::text = user_low or auth.uid()::text = user_high
  );

drop policy if exists dm_threads_update_own on public.dm_threads;
create policy dm_threads_update_own on public.dm_threads
  for update
  using (auth.uid()::text = user_low or auth.uid()::text = user_high)
  with check (auth.uid()::text = user_low or auth.uid()::text = user_high);

-- Messages: readable/writable only if you are in the parent thread.
drop policy if exists dm_messages_select_own on public.dm_messages;
create policy dm_messages_select_own on public.dm_messages
  for select
  using (
    exists (
      select 1 from public.dm_threads t
      where t.id = thread_id
        and (auth.uid()::text = t.user_low or auth.uid()::text = t.user_high)
    )
  );

drop policy if exists dm_messages_insert_own on public.dm_messages;
create policy dm_messages_insert_own on public.dm_messages
  for insert
  with check (
    auth.uid()::text = sender_id
    and exists (
      select 1 from public.dm_threads t
      where t.id = thread_id
        and (auth.uid()::text = t.user_low or auth.uid()::text = t.user_high)
    )
  );

drop policy if exists dm_messages_update_own on public.dm_messages;
create policy dm_messages_update_own on public.dm_messages
  for update
  using (
    exists (
      select 1 from public.dm_threads t
      where t.id = thread_id
        and (auth.uid()::text = t.user_low or auth.uid()::text = t.user_high)
    )
  );

comment on table public.dm_threads is '1:1 DM threads. Pair is ordered (user_low < user_high).';
comment on table public.dm_messages is 'DM bodies. RLS limits access to thread participants only.';
