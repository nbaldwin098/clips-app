# Dependency & dead-code audit

Run anytime:

```bash
npm run audit:deps
```

## What we already had (good)

- **Vite 8** + `@vitejs/plugin-react` + Tailwind v4 Vite plugin — no Webpack.
- **No lodash / moment / jQuery** — dates and cloning should stay native (`Intl`, `structuredClone`).
- Small runtime surface: React, Supabase client, lucide icons, clsx/tailwind-merge.

## Cut in this pass

| Item | Why |
|------|-----|
| `canvas-confetti` | Never imported |
| `puppeteer-core` | Only used by optional `scripts/ad-browser-check.mjs` (~20MB+ tooling). Install on demand. |
| 16 dead source files | Old Navbar/Sidebar, RelatedRow, VideoPlayerModal, empty seeds, unused aliases, etc. |

`npm install` dropped from ~223MB to ~193MB of `node_modules` after removing those packages.

## Bug found by the audit

`App.jsx` rendered `<MfaGate />` but **never imported it**. Knip reported `MfaGate.jsx` as unused; MFA would crash at runtime. Fixed by wiring the import.

## Why it feels like “10 bugs per 1 fix”

1. **Duplicate shells** — Agents fixed ads/nav in dead files (`Navbar.jsx`, `Sidebar.jsx`, `VideoPlayerModal.jsx`) while production used `StreamingNavbar`, `CollapsibleSidebar`, `WatchPage`. Deleting the dead twins stops that.
2. **Parallel PRs on the same surfaces** — Ads, clips scroll, and uploads changed in many overlapping branches; each fix assumed a different contract (zone ids, scroll snap, blob vs http media).
3. **Local + cloud dual write** — Uploads could look fine on one device (IndexedDB / blob) and be unplayable for everyone else when cloud rows had empty media. Healing code then raced with purge logic.
4. **String smoke tests, not runtime graphs** — `live-smoke.mjs` catches missing labels; it does not catch missing imports or unplayable media until a real browser path runs.
5. **External ad network** — ExoClick fill/zone mismatches look like product bugs and churn every deploy.

## Keep doing

- Run `npm run knip` before large PRs.
- Prefer one live component per concern; delete aliases when Studio/Watch absorbs them.
- Do not add utility mega-libraries for one-liners.
