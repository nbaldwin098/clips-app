# How backend works for Clips (free path)

## Cross-device sync setup checklist (Render + Supabase)

Every browser keeps a local cache (`localStorage`) of the content catalog
so the app works offline and instantly reflects your own uploads. That
cache is **not** shared between devices or users on its own — without a
backend, nothing you upload can ever appear anywhere else. If you already
have a Supabase project and Render env vars set up (e.g. from following
outside guidance), go through this checklist — having *a* Supabase project
isn't enough on its own, the exact pieces below all have to be in place:

1. **Env var names must match exactly** (Vite only exposes vars prefixed
   `VITE_` to client code — see `.env.example`):
   - `VITE_SUPABASE_URL` — your project's URL, e.g. `https://xxxx.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` — the project's public **anon** key (Settings
     → API in the Supabase dashboard). Never use the `service_role` key
     here — it's a secret server key, not meant for client-side code.
   - In Render: Dashboard → your service → **Environment** tab → add both
     as Environment Variables, then trigger a redeploy (env var changes
     don't apply to an already-running/built instance).
2. **Run the SQL migrations** in the Supabase SQL editor (Dashboard →
   SQL Editor → New query → paste → Run), in order:
   - `supabase/migrations/0001_videos_table.sql` — the shared video/clip
     catalog table (what makes uploads visible across devices/users).
   - `supabase/migrations/0002_watch_progress_table.sql` — cross-device
     watch history/resume.
   - `supabase/migrations/0003_clips_storage_bucket.sql` — creates the
     public `clips` Storage bucket that hosted file uploads need (without
     it, `uploadVideoToSupabase`/`uploadImageToSupabase` fail silently and
     every upload falls back to local-only).
   - `supabase/migrations/0004_profiles.sql` — profiles + admin/creator
     roles. After it runs, promote yourself once:
     `update public.profiles set role = 'admin', creator_status = 'approved' where id = '<your auth uuid>';`
   - `supabase/migrations/0005_site_promos.sql` — admin promo banners visible on every device.
   None of these will error if run more than once (all use `if not
   exists` / `drop policy if exists`).
   Also set `VITE_ADMIN_CODE` (no default password ships in the app) and
   `VITE_PLATFORM_OWNER_ID` (your Supabase user UUID) on Render.
3. **Sign in with a real Supabase account**, not the local-only fallback
   login that's used when Supabase isn't configured — `AuthModal` shows
   "Local this device" vs "Synced across devices" so you can tell which
   one is active for your current session.
4. **Merge the PR that implements this** (`cursor/cross-device-content-sync`)
   into `main`, and let Render redeploy — until that's merged, the running
   app doesn't have this sync code at all, regardless of how the backend
   itself is configured.

## Security notes (do not skip)

- Never put the Supabase `service_role` key in Render `VITE_*` vars.
- `VITE_ADMIN_CODE` has **no default** in the app. If it is missing, the
  admin portal stays locked.
- `VITE_PLATFORM_OWNER_ID` should be your Supabase Auth user UUID so
  admin is tied to your account, not a forgeable `@cs1` handle.
- Privileges (admin / creator) are loaded from `public.profiles` after
  you run `0004_profiles.sql`. localStorage cannot grant admin anymore.

Once all of the above is true, `src/lib/contentSync.js` pushes each
publish's metadata to the `videos` table and pulls the latest rows into
every client's local cache on load, after publishing, and on a ~45s
interval — see `src/lib/contentService.js` (`publishLocalMedia`,
`importUserLink`) and `src/lib/picsService.js` (`publishPhoto`).

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
