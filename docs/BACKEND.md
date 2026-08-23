# How backend works for Clips (free path)

## Cross-device sync (required for multi-device/multi-user visibility)

Every browser keeps a local cache (`localStorage`) of the content catalog
so the app works offline and instantly reflects your own uploads. That
cache is **not** shared between devices or users on its own — without a
backend, nothing you upload can ever appear anywhere else. To make uploads
visible across devices/users:

1. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (Supabase project
   env vars — see `.env.example`).
2. Run `supabase/migrations/0001_videos_table.sql` in that project's SQL
   editor (or `supabase db push`). It creates the shared `videos` table with
   row-level security: anyone can read, but a row can only be inserted /
   updated / deleted by the signed-in user who owns it (`creator_id =
   auth.uid()`).
3. Sign in with a real Supabase account (not the local-only fallback login
   that's used when Supabase isn't configured — `AuthModal` shows "Local
   this device" vs "Synced across devices" so you can tell which one is
   active).

Once configured, `src/lib/contentSync.js` pushes each publish's metadata
to that table and pulls the latest rows into every client's local cache on
load, after publishing, and on a ~45s interval — see
`src/lib/contentService.js` (`publishLocalMedia`, `importUserLink`) and
`src/lib/picsService.js` (`publishPhoto`).

## Content model (what users do)

**Default: link import (recommended)**  
User pastes TikTok / YouTube Shorts / Instagram / Twitch / Kick URL.  
We store: title metadata, platform, source URL, cross-post flag.  
We do **not** download the video file.  
→ Cheap, fast, not too much for creators.

**Optional: file upload**  
Only when they want a copy on Clips. Client compresses toward 720p first.  
→ Use sparingly.

**We do not** scrape or rehost without rights.

## Backend stack (free)

| Piece | Free option |
|-------|-------------|
| Auth + DB | Supabase free |
| Stripe secret | Edge Function env STRIPE_SECRET_KEY |
| Publishable | Render VITE_STRIPE_PUBLISHABLE_KEY |
| Owned media | R2 / B2 later |
| Live | MediaMTX later |

## Order

1. Static + pk (now)
2. Supabase Auth
3. Checkout with sk_
4. Live when demanded
