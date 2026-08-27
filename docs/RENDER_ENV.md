# Render / Node env checklist (calabi.us)

Critical browser-public vars (must be present at **build** and runtime for Next):

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Cloud catalog, auth, wallets |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Supabase anon key |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` or `VITE_STRIPE_PUBLISHABLE_KEY` | for checkout | Stripe.js |
| `STRIPE_SECRET_KEY` | server | Checkout session / webhooks |
| `STRIPE_WEBHOOK_SECRET` | server | Verify Stripe webhooks |

Optional / legacy aliases still read by client helpers:

- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- Coin pack Payment Links / tip links (see `src/lib/stripeConfig.js`)
- `VITE_LIVE_INGEST_CONNECTED` — only set `true` when RTMP/HLS is really live

Health check: `GET /api/health` → 200 when Supabase env present, 503 otherwise.

Deploy notes:

1. Use the **Node** web service on Render — not a Static Site.
2. After migrate, confirm Admin → Setup lists SQL through the latest `supabase/migrations/*.sql`.
3. Old Static Render service for this domain must stay deleted (BUG-007).
