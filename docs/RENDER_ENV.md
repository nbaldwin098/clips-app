# Render / Node env checklist (calabi.us)

Critical browser-public vars (must be present at **build** and runtime for Next):

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Cloud catalog, auth, wallets |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Supabase anon key |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` or `VITE_STRIPE_PUBLISHABLE_KEY` | for checkout | Stripe.js |
| `VITE_ADMIN_CODE` | admin unlock | No default in app |
| `VITE_PLATFORM_OWNER_ID` | owner tie-in | Supabase Auth UUID |
| `STRIPE_SECRET_KEY` | Edge Function secret | Checkout sessions (not a Render `NEXT_PUBLIC_*`) |
| `STRIPE_WEBHOOK_SECRET` | Edge / server | Verify webhooks if enabled |

Optional / legacy aliases still read by client helpers:

- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- `VITE_LIVE_INGEST_CONNECTED` — only set `true` when RTMP/HLS is really live
- `VITE_LIVE_RTMP_URL` / `NEXT_PUBLIC_LIVE_RTMP_URL` — real ingest only
- `VITE_LIVE_HLS_BASE` — HLS play base (MediaMTX / CDN)
- `VITE_OAUTH_*_CLIENT_ID` — social publish (see `docs/INFRA.md`)
- `VITE_OAUTH_START_URL` — Edge `oauth-start` URL
- `VITE_MAIL_FUNCTION_URL` — real email codes (else demo code)
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VITE_PUSH_SUBSCRIBE_URL` — Web Push
- `VITE_CLIENT_TRANSCODE=1` — optional browser ffmpeg.wasm (off by default)
- Do **not** set `VITE_STRIPE_PAYMENT_LINK` (own Checkout only)

Free scaffolds + blocked infra (Connect secrets, RTMP host, OAuth apps, push keys, native, full translations): **`docs/INFRA.md`**. MediaMTX: **`docs/mediamtx.md`**.

Health check: `GET /api/health` → 200 when Supabase env present, 503 otherwise.

Deploy notes:

1. Use the **Node** web service on Render — not a Static Site (`render.yaml`).
2. After migrate, confirm Admin → Setup lists SQL through the latest `supabase/migrations/*.sql` (through `0023`).
3. Old Static Render service for this domain must stay deleted (BUG-007).
4. Full checklist: `docs/DEPLOY_CHECKLIST.md`. Migrations vs Admin Setup explained there.