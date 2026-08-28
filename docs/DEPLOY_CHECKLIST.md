# Deploy checklist (Node)

## Migrations vs Admin Setup

| Path | When |
|------|------|
| Supabase SQL Editor + files in `supabase/migrations/` | Greenfield / catching up production — run **in order** |
| Admin → Setup (`SETUP_SCRIPTS`) | Same SQL as copy-paste blocks for the owner |

`0001`–`0004` are required before anything that references `profiles` or Storage. Keep Admin Setup in sync through the latest migration file.

## Ship checklist

1. [ ] Domain `calabi.us` points only at the **Node** Render service (Static Site deleted).
2. [ ] Render env from `docs/RENDER_ENV.md` is set; redeploy after any `NEXT_PUBLIC_*` change.
3. [ ] Supabase Edge secrets set: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `APP_PUBLIC_URL=https://calabi.us`.
4. [ ] Edge Functions deployed: `create-checkout-session`, `stripe-webhook`, `admin-withdraw`, `admin-finance`, `push-subscribe`.
5. [ ] `npm run build` succeeds.
6. [ ] Apply any new files under `supabase/migrations/` in the SQL editor.
7. [ ] `GET https://calabi.us/api/health` returns `{ ok: true }` with `supabaseConfigured: true`.
8. [ ] Spot-check: sign-in, upload a clip, refresh, play; open Coins; open Creator Studio.
9. [ ] Stripe **test** purchase credits Coins once (refresh must not double-credit).
10. [ ] Live lobby does **not** claim RTMP connected (`liveIngestFlagOn` false unless you have a real server).

Rollback: redeploy previous Node deploy; do not re-enable Static Site hosting.
