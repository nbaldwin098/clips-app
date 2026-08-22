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

## videos
- id uuid
- owner_id fk nullable
- type text
- title text
- description text
- source_url text
- media_url text
- thumb_url text
- origin text
- license text
- attribution text
- is_seed bool default false
- stored_bytes int default 0
- duration_sec int
- tags text[]
- privacy text default 'public'
- created_at timestamptz

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
