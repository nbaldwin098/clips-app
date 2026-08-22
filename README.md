# Clips

Vertical shorts, live streaming, and long-form in one product.

**Discovery:** Learning machine ranked by completion, rewatches, shares, and skips. Adaptive per-user taste profiles. Follower count never ranks content.

**Monetization:** Creators keep 100% of subscription list price (fees on top for buyers). Ad pool 90/10 by impression share.

**Storage:** Primary path is link import (TikTok / YouTube Shorts / Instagram / Twitch / Kick). We store only metadata + source URL — no binary on our servers. Optional owned-file path uses client-side compression before upload.

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

## Architecture notes

- `src/lib/algorithmEngine.js` — adaptive ranking + `recordInteraction`
- `src/lib/crossPostDetector.js` — source platform heuristics
- `src/lib/storage.js` — zero-storage import helpers + local persistence
- `src/lib/financialLedger.js` — on-top fee math
- Settings cover Account, Security, Stream, Chat, Monetization, Copyright/DMCA, Notifications, Roles, Analytics

## Product backlog

See `PRODUCT_BACKLOG.md` for the full open/closed list.

## Legal intake (MVP)

- DMCA notices: copyright@platform.internal
- Counter-notifications: dmca-counter@platform.internal
