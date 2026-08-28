# calabi

Vertical shorts, live streaming, and long-form in one product.  
Product name is **calabi**. “Clips” in the UI means the short-form format (`/clips`, storage bucket `clips`). Those identifiers are not renamed — renaming them would break existing media and URLs.

**Discovery:** Ranked by completion, rewatches, shares, and skips. Follower count never ranks content.

**Monetization:** Membership list price at checkout. Platform fee is 4% of list. Creator payouts are **calabi-owned** (Studio → Earnings + Admin withdraw queue). Stripe Connect Express is off. See `docs/OWN_PAYOUTS.md`.

**Storage:** Prefer a public link. Local files stay in that browser unless Supabase Storage bucket `clips` is configured.

**Cross-device sync:** Requires `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Vite aliases still work) plus migrations under `supabase/migrations/`. Without that, uploads only exist in that browser’s localStorage — see `docs/BACKEND.md`.

**Ops:** `docs/RENDER_ENV.md` · `docs/DEPLOY_CHECKLIST.md` · `docs/INFRA.md` · bug log: `docs/BUGS.md`.

## Stack

- React 19 + Next.js 15 (App Router) + Tailwind CSS 4 — Vite kept as `dev:vite` / `build:vite` fallback
- SEO: dedicated `app/*/page.jsx` routes + metadata; interactive UI mounts via `SpaShell`
- Catalog: Supabase `videos` + Storage bucket `clips`
- Node deploy on Render (`next build` / `next start`) — `render.yaml`

## Scripts

```bash
npm install
npm run dev
npm run build
npm run preview
npm test
```

## Architecture notes

- `src/lib/algorithmEngine.js` — adaptive ranking + `recordInteraction`
- `src/lib/crossPostDetector.js` — source platform heuristics
- `src/lib/contentService.js` — feed/import facade for UI
- `src/lib/contentSync.js` — shared `videos` table (no-op without Supabase)
- `src/lib/storage.js` — import helpers + local persistence
- `src/lib/financialLedger.js` — fee math
- `src/lib/orgConfig.js` — product name, domain, inboxes

## Legal intake

- DMCA notices: copyright@calabi.us
- Counter-notifications: dmca@calabi.us
