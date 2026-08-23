# Clips

Vertical shorts, live streaming, and long-form in one product.

**Discovery:** Learning machine ranked by completion, rewatches, shares, and skips. Adaptive per-user taste profiles. Follower count never ranks content.

**Monetization:** Creators keep 100% of subscription list price (fees on top for buyers). Ad pool 90/10 by impression share.

**Storage:** Primary path is link import (social or legal library). Metadata + source URL only. Legal cold-start library: NASA / Wikimedia / Archive.org with attribution on every card.

**Cross-device sync:** requires Supabase (`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`) plus the migration in `supabase/migrations/0001_videos_table.sql`. Without it, uploads only exist in that one browser's localStorage — see `docs/BACKEND.md`.

**UI handoff:** `docs/UI_HANDOFF.md` · `docs/BACKEND_SCHEMA.md`.

## Stack

- React 19 + Vite 8 + Tailwind CSS 4
- localStorage cache for sessions/taste/imports, optionally synced to Supabase across devices (see `docs/BACKEND.md`)
- Static deploy (Render / any static host)

## Scripts

```bash
npm install
npm run dev
npm run build
npm run preview
```

## Architecture notes

- `src/lib/algorithmEngine.js` — adaptive ranking + `recordInteraction`
- `src/lib/crossPostDetector.js` — source platform heuristics
- `src/lib/contentService.js` — feed/import facade for UI
- `src/lib/contentSync.js` — pushes/pulls the shared `videos` table so uploads sync across devices/users (no-op without Supabase)
- `src/lib/storage.js` — zero-storage import helpers + local persistence
- `src/data/legalSeed.js` — PD/CC legal library
- `src/lib/financialLedger.js` — on-top fee math

## Legal intake (MVP)

- DMCA notices: copyright@platform.internal
- Counter-notifications: dmca-counter@platform.internal
