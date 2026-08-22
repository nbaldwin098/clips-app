# Clips

Vertical shorts, live streaming, and long-form in one product.

**Discovery:** Learning machine ranked by completion, rewatches, shares, and skips. Adaptive per-user taste profiles. Follower count never ranks content.

**Monetization:** Creators keep 100% of subscription list price (fees on top for buyers). Ad pool 90/10 by impression share.

**Storage:** Zero raw masters on ingress. Client-side compression path. Zero-storage URL importer with cross-post detection.

## Stack

- React 19 + Vite 8 + Tailwind CSS 4
- Client-only MVP (localStorage sessions, taste, imports)
- Static deploy (Render / any static host)

## Scripts

```bash
npm install
npm run dev
npm run build
npm run preview
```

## Key modules

- `src/lib/algorithmEngine.js` — adaptive ranking + `recordInteraction`
- `src/lib/crossPostDetector.js` — source platform heuristics
- `src/lib/storage.js` — persistence + zero-cost helpers
- `src/lib/financialLedger.js` — on-top fee math

## Legal intake

- DMCA: copyright@platform.internal
- Counter-notifications: dmca-counter@platform.internal

See `PRODUCT_BACKLOG.md` for the full checklist.
