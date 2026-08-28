# Stabilization (2026-08-28)

What this branch actually changed, and what still requires your dashboard.

## Code that was broken on main

`src/App.jsx` and `src/components/dash/DashboardShell.jsx` contained unresolved git merge markers from Cursor batches. That prevents a clean production build. Those markers are removed on this branch.

## Product name

- User-facing product name: **calabi** (`orgConfig.js`, layout metadata, auth emails, iOS display name).
- Format name **Clips** and route `/clips` and Storage bucket `clips` stay. Do not rename the bucket without a migration.

## Env (you already listed the keys)

Exact split is in `docs/RENDER_ENV.md`.

I cannot deploy Edge Functions or set secret *values* from here. After merge:

1. Confirm Render has the `NEXT_PUBLIC_*` / `VITE_*` keys and **redeploy**.
2. Confirm Supabase secrets and run the deploy commands in that doc.
3. Open `https://calabi.us/api/health` — `ok` must be true; `liveIngestFlagOn` must be false unless you have real RTMP/HLS.

## Not faked

- Live ingest is still lobby + window-share until a media server exists.
- Stripe Connect Express stays off.
- Push works only if VAPID public is on Render and private is on Edge + `push-subscribe` is deployed.
