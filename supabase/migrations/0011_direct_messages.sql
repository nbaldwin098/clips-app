-- Direct messages between two real accounts. End-to-end encrypted: this
-- table only ever stores ciphertext + a random IV per message. Plaintext
-- is derived and read in the browser via ECDH public keys (src/lib/dmCrypto.js,
-- src/lib/directMessages.js) and never touches the database. Run this in
-- the SQL editor after 0006_social_graph.sql (needs public.profiles).

alter table public.profiles add column if not exists public_key text;

-- One row per pair of people talking. Tiny and free of message content —
-- it only exists so the inbox can list "who, and when" without scanning
-- every encrypted message.
create table if not exists public.dm_conversations (
  conversation_id text primary key,
  user_a uuid not null references auth.users (id) on delete cascade,
  user_b uuid not null references auth.users (id) on delete cascade,
  last_message_at timestamptz not null default now(),
  last_read_a timestamptz,
  last_read_b timestamptz,
  constraint dm_conversations_distinct_users check (user_a <> user_b)
);
create index if not exists dm_conversations_user_a_idx on public.dm_conversations (user_a, last_message_at desc);
create index if not exists dm_conversations_user_b_idx on public.dm_conversations (user_b, last_message_at desc);

create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id text not null references public.dm_conversations (conversation_id) on delete cascade,
  sender_id uuid not null references auth.users (id) on delete cascade,
  recipient_id uuid not null references auth.users (id) on delete cascade,
  ciphertext text not null,
  iv text not null,
  created_at timestamptz not null default now()
);
create index if not exists direct_messages_conversation_idx on public.direct_messages (conversation_id, created_at);
create index if not exists direct_messages_recipient_idx on public.direct_messages (recipient_id, created_at);

alter table public.dm_conversations enable row level security;
alter table public.direct_messages enable row level security;

drop policy if exists "dm_conversations_select" on public.dm_conversations;
create policy "dm_conversations_select" on public.dm_conversations for select
  using (auth.uid() = user_a or auth.uid() = user_b);
drop policy if exists "dm_conversations_insert" on public.dm_conversations;
create policy "dm_conversations_insert" on public.dm_conversations for insert
  with check (auth.uid() = user_a or auth.uid() = user_b);
drop policy if exists "dm_conversations_update" on public.dm_conversations;
create policy "dm_conversations_update" on public.dm_conversations for update
  using (auth.uid() = user_a or auth.uid() = user_b);

drop policy if exists "direct_messages_select" on public.direct_messages;
create policy "direct_messages_select" on public.direct_messages for select
  using (auth.uid() = sender_id or auth.uid() = recipient_id);
drop policy if exists "direct_messages_insert" on public.direct_messages;
create policy "direct_messages_insert" on public.direct_messages for insert
  with check (auth.uid() = sender_id);
drop policy if exists "direct_messages_delete" on public.direct_messages;
create policy "direct_messages_delete" on public.direct_messages for delete
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

-- Push new messages instantly instead of waiting on a poll. Safe to re-run.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'direct_messages'
  ) then
    alter publication supabase_realtime add table public.direct_messages;
  end if;
end $$;
