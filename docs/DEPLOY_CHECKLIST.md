# Deploy checklist (Node)

## Migrations vs Admin Setup

| Path | When |
|------|------|
| Supabase SQL Editor + files in `supabase/migrations/` | Greenfield / catching up production — run **in order** |
| Admin → Setup (`SETUP_SCRIPTS`) | Same SQL as copy-paste blocks for the owner |

`0001`–`0004` are required before anything that references `profiles` or Storage. Keep Admin Setup in sync through the latest migration file.

## Ship checklist

1. [ ] Domain points only at the Node Render service (Static Site deleted).
2. [ ] Env vars from `docs/RENDER_ENV.md` set on the service; redeploy after changes.
3. [ ] `npm run build` succeeds locally / in CI.
4. [ ] Apply any new files under `supabase/migrations/` in Supabase SQL editor (see Admin → Setup).
5. [ ] `GET https://calabi.us/api/health` returns `{ ok: true }`.
6. [ ] Spot-check: sign-in, upload a clip, open Coins, open Creator Studio Analytics.
7. [ ] Stripe test purchase return credits Coins once (refresh should not double-credit).

Rollback: redeploy previous Node deploy; do not re-enable Static Site hosting.
