# Clips

Next-generation vertical short-form video and live-streaming platform designed for a zero-dollar bootstrap MVP.

## Core product principles

- **Meritocratic discovery**: Ranking is driven purely by real-time engagement velocity (completion rate, loops, shares, comments/saves, likes). Creator follower count is never used as a ranking signal.
- **100% creator-owned subscriptions**: Creators receive the full listed subscription or tip amount. A transparent processing fee is charged on top to the buyer.
- **90/10 ad revenue pool**: 90% of the monthly ad pool is distributed to creators by verified impression share; 10% is retained by the platform.
- **Zero-cost media architecture**:
  - Client-side compression target (720p vertical) before any network upload.
  - Zero-storage reference importer (metadata + external URL only).
  - Backblaze B2 compatible object storage path ($0.005/GB) with Cloudflare edge caching for egress protection.

## Stack

- React 19 + Vite 8
- Tailwind CSS 4
- Lucide React icons
- Oxlint

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Project structure

```
src/
  components/     # UI: Navbar, Sidebar, feeds, modals, wallet, dashboard
  context/        # Auth (dual-role viewer / creator)
  data/           # Verified public creators and representative content
  lib/            # Algorithm, financial ledger, storage helpers, utils
  App.jsx
  main.jsx
  index.css
```

## Notes

- Content catalog uses verified public creators only (no fabricated personas).
- No emoji characters in the codebase.
- Theme is 99% white with powder-blue accents (`#2C729B`) in positions analogous to YouTube red.
- Import Short and Cost Simulator are available from the top bar and Creator Studio.

## License

Private / proprietary for the Clips MVP.
