# Deploy checklist (Node)

1. [ ] Domain points only at the Node Render service (Static Site deleted).
2. [ ] Env vars from `docs/RENDER_ENV.md` set on the service.
3. [ ] `npm run build` succeeds locally / in CI.
4. [ ] Apply any new files under `supabase/migrations/` in Supabase SQL editor (see Admin → Setup).
5. [ ] `GET https://calabi.us/api/health` returns `{ ok: true }`.
6. [ ] Spot-check: sign-in, upload a clip, open Coins, open Creator Studio Analytics.
7. [ ] Stripe test purchase return credits Coins once (refresh should not double-credit).

Rollback: redeploy previous Node deploy; do not re-enable Static Site hosting.
