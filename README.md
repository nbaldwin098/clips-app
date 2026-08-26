# Clips

Vertical shorts, live streaming, and long-form in one product.

**Discovery:** Learning machine ranked by completion, rewatches, shares, and skips. Adaptive per-user taste profiles. Follower count never ranks content.

**Monetization:** Membership list price is shown at checkout. Payouts to creators are not live until Stripe Connect is connected.

**Storage:** Prefer a public link. Local files stay in that browser unless Storage is configured.

**Cross-device sync:** requires Supabase (`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`) plus the migration in `supabase/migrations/0001_videos_table.sql`. Without it, uploads only exist in that one browser's localStorage — see `docs/BACKEND.md`.

**UI handoff:** `docs/UI_HANDOFF.md` · `docs/BACKEND_SCHEMA.md` · **bug log:** `docs/BUGS.md` (fix little by little).

## Stack

- React 19 + Next.js 15 (App Router) + Tailwind CSS 4 (Vite kept as fallback during migrate)
- Catalog/source of truth: Supabase (`videos` + Storage bucket `clips`)
- Node deploy on Render (`next build` / `next start`) — see `render.yaml`

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

- DMCA notices: copyright@calabi.us
- Counter-notifications: dmca@calabi.us
