# Backend schema (target) — ready for Supabase

## users
- id uuid pk
- email text unique
- display_name text
- handle text unique
- avatar_url text
- provider text
- is_creator bool
- created_at timestamptz

## channels
- user_id fk
- bio text
- banner_url text
- stream_key text
- stream_region text

## videos — **implemented**, see `supabase/migrations/0001_videos_table.sql`
Shared cross-device/cross-user content catalog. Every publish (video, clip,
or pic) upserts its metadata here when the actor is signed in via Supabase;
every client pulls the latest rows on load and merges them into its local
cache (`src/lib/contentSync.js`). RLS: public read, insert/update/delete
only where `creator_id = auth.uid()`.
- id text pk (client-generated, e.g. `up_172839...`)
- creator_id uuid references auth.users, nullable
- handle text
- type text — `video` | `short` | `pic`
- title text
- description text
- source_url text
- media_url text
- thumb_url text
- origin text
- hosted bool default false
- stored_bytes bigint default 0
- duration_sec numeric default 0
- width int
- height int
- tags text[]
- engagement jsonb default '{}'
- views bigint default 0
- created_at timestamptz default now()

## imports
- id uuid
- user_id fk
- video_id fk nullable
- source_url text
- platform text
- cross_post bool
- created_at timestamptz

## events
- id bigserial
- user_id fk nullable
- video_id fk
- kind text
- value float
- created_at timestamptz

## follows
- follower_id fk
- following_id fk

## strikes
- user_id fk
- reason text
- notice_id text
- created_at timestamptz
- expires_at timestamptz

## ledger_entries
- id uuid
- creator_id fk
- kind text
- amount_cents int
- currency text
- meta jsonb
- created_at timestamptz
