# Runbook — Supabase outage / missing env

## Symptoms
- Uploads look successful then vanish on refresh.
- Empty home/clips after deploy.
- `/api/health` returns 503 `supabase: missing`.

## Immediate
1. Verify `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` on Render (rebuild if only build-time).
2. Browser console should log a loud `[calabi] … SUPABASE … missing` if unset.
3. Supabase status page — if down, enable read-only messaging; do not wipe local catalog prices (`healLocalState` must not clear paid fields).

## Recovery
1. Restore env → redeploy Node service.
2. Confirm Admin → Setup migrations applied.
3. `syncContentFromCloud` on next page load.
4. Spot-check one known public content id SSR page.
