# calabi — bug & fix log

Living backlog. Add every bug, debt item, and “we should fix this” note here — even if the list grows past 500. Work **little by little**: pick the next open **P0**, then **P1**, one PR at a time.

## How we use this

1. **New issue** → add a row under [Open](#open) with the next `BUG-xxx` id.
2. **Starting work** → set status to `doing`, note the branch/PR.
3. **Shipped** → move the row to [Done](#done) with the PR link and date.
4. **Won’t fix / obsolete** → move to [Won’t fix](#wont-fix) with a one-line reason.
5. Prefer **one bug (or small cluster) per PR**. Do not boil the ocean.

### Status

| Tag | Meaning |
|-----|---------|
| `open` | Not started |
| `doing` | Branch/PR in flight |
| `blocked` | Waiting on env, product decision, or external service |
| `done` | Merged to `main` |

### Priority

| Tag | Meaning |
|-----|---------|
| **P0** | Broken product / data loss / can’t upload / auth / blank site |
| **P1** | Wrong UX, SEO gaps, creator tools, money path |
| **P2** | Polish, cleanup, tests, docs, dead code |
| **P3** | Ideas / future / nice-to-have |

---

## Open

### P0 — fix first

Ship-blocking P0s from the 2026-08-27/30 launch list are **cleared** (verified on `main` + this PR). Remaining live risk is infra, not product crashes: **BUG-010** (real RTMP/HLS) stays P1 and must not be faked.

| ID | Area | Issue | Notes | Status |
|----|------|-------|-------|--------|
| — | — | No open P0 ship-blockers | See [Done](#done) for BUG-007 / 091 / 092 / 114–117 / 121 | — |

### P1 — important

| ID | Area | Issue | Notes | Status |
|----|------|-------|-------|--------|
| BUG-010 | Live | Live ingest not connected — lobby only | Gate is `VITE_LIVE_INGEST_CONNECTED` only (URLs alone do not invent connected). OBS/RTMP/HLS still need VPS | `open` |
| BUG-123 | Push | VAPID key missing in local/guest env → “need VAPID” on Live | Needs `NEXT_PUBLIC_VAPID_PUBLIC_KEY` on deploy | `open` |
| BUG-124 | i18n | Page bodies still mostly English after locale switch | Chrome/nav wired; deeper strings backlog (was BUG-086) | `open` |
| BUG-125 | Dead | Orphan `RewardsPage.jsx` + `rewards.js` (5%) still on disk | Deleted in phase2 finish | `done` |
| BUG-011 | Live | Host ad controls / liveAds stubs after ads removal | LiveView + Stream settings controls removed; thin stubs kept for advertise portal | `done` |
| BUG-012 | Ads | Decide monetization path: AdSense vs none vs later video ads | Product decision: no ads for now; tips/premium/Cash | `wontfix` |
| BUG-013 | Ads | Wire AdSense units for clip-feed + pic-feed if keeping AdSense | Cancelled with BUG-012 | `wontfix` |
| BUG-014 | Creator Studio | Setup hub / earnings / apply badge not on `main` | Studio hub + grouped rail shipped | `doing` |
| BUG-015 | Creator Studio | Orphan AnalyticsPage / channel branding duplication | Settings grouped template; Account uses SettingsTemplates | `doing` |
| BUG-016 | Payouts | Own Earnings + Admin withdraw queue (Stripe Express off) | See `docs/OWN_PAYOUTS.md`; deploy `admin-withdraw` | `doing` |
| BUG-017 | SEO | Dynamic sitemap for public content ids | Done in #106 | `done` |
| BUG-018 | SEO | Server-render real HTML for About/Help/Legal bodies | Done in #106 | `done` |
| BUG-019 | Watch | Share OG tags depend on Supabase row fetch | Soft unavailable + article HTML in #106 | `done` |
| BUG-020 | Uploads | Clip 60s / video 24h limits — confirm UX errors are clear | Modal hint + immediate duration probe + publish reject (`clipLimitsMessage` / `videoLimitsMessage`) | `done` |
| BUG-021 | iOS | Keep original-file upload path (no WebM re-encode) | Regression test + WebM refuse in `videoTranscode`; default stays original-file | `doing` |
| BUG-022 | Delete | Cloud delete path for admin/creator — verify on Node deploy | Harden `deleteCatalogItem` + `deleteHostedMedia` (signed/public/path, cloud row fetch, warn on fail) | `doing` |
| BUG-023 | Chat | Live chat cloud sync reliability | Reconnect/poll fallback + shared subscribe hub + channel key normalize | `doing` |
| BUG-024 | Feed | Endless clip/pic scroll edge cases | Prior PRs fixed stalls; re-verify after Next | `open` |
| BUG-028 | Home | All/Videos/Shorts/Pics chips + empty “No posts yet” | #111 + #112 hydrate/early sync | `done` |
| BUG-025 | Error reports | ErrorReportPrompt shipped — confirm tickets show in Admin | PR #96 | `open` |
| BUG-026 | Header | Logo-only header / no hamburger — confirm mobile sidebar OK | #97/#98 | `open` |
| BUG-027 | Open PRs | Close or rebase stale drafts #93, #101, #102, #58, #71 | Closed; merged branches deleted | `done` |

### P2 — cleanup & quality

| ID | Area | Issue | Notes | Status |
|----|------|-------|-------|--------|
| BUG-040 | Tests | Flaky `test-named-activity.mjs` (“browser fallback likes…”) | Softened / quarantined in npm test chain on batch branch | `doing` |
| BUG-041 | Tests | Add Playwright/browser smoke for upload → play | String smoke isn’t enough | `open` |
| BUG-042 | Dead code | Remove no-op ad modules or finish AdSense replacement | Deleted AdUnits/ExoClick/VAST hooks; thin `adEngine`/`vastAds`/`liveAds` stubs remain for advertise portal + smoke | `done` |
| BUG-043 | Dead code | Remove Vite path when Next peel is complete | Keep `build:vite` until SpaShell gone | `open` |
| BUG-044 | Knip | Run `npm run knip` and clear new unused after Next | | `open` |
| BUG-045 | Docs | Update AdminSetup / Help for Node deploy + no hamburger | Help + AdminSetup updated on `cursor/do-500-batch-09e7` | `doing` |
| BUG-046 | Env | Document required Render env vars for Node service | `docs/RENDER_ENV.md` + deploy checklist | `doing` |
| BUG-047 | Dual write | Any remaining local-only media paths | Cloud is source of truth | `open` |
| BUG-048 | Security | Review RLS on `videos` + storage policies after bucket recreate | 0028: WITH CHECK, admin delete, unlisted via `get_video_by_id` | `doing` |
| BUG-049 | Perf | First Load JS ~255kB SpaShell — code-split peeled routes | | `open` |
| BUG-050 | A11y | Live chat `aria-live` — spot-check after Next | LiveChatPanel has aria-live; toast region + skip-link on batch branch | `doing` |
| BUG-051 | Legal | Terms still say “Clips” in places — brand to calabi | Done in #106 | `done` |
| BUG-052 | Product | Notifications: no push/email yet | In-app only | `open` |
| BUG-053 | Product | 2FA / MFA gate — verify import + flow on Next | Past missing-import bug | `open` |
| BUG-054 | Product | VOD library is device-local metadata | `vods` + `stream_settings` tables in 0016; wire sync next | `doing` |
| BUG-055 | Product | Concurrent viewer graph missing | Audience network map in Analytics (#123); concurrent live graph still open | `partial` |
| BUG-088 | Studio | Bubble map invented tally bubbles / no pan / no people | Shipped in #123 | `done` |
| BUG-089 | Catalog | Post “posted at” drifted on updates | `first_published_at` + 0015 in #123 — run SQL in Supabase | `done` |
| BUG-096 | Cloud | Remaining local-first domains (payouts, channel staff, youtubeParity extras) | Migrate next; no new local SOT allowed | `open` |
| BUG-097 | Nav | Left menu expanded with no close | Forced icons-only rail | `doing` |
| BUG-098 | Shop | Marketplace + seller portal + Stripe escrow | Cloud tables 0018 | `doing` |
| BUG-099 | Admin | CS/mod template + support desk + analytics | Admin portal reorganized | `doing` |
| BUG-056 | Product | Custom emotes partial | | `open` |
| BUG-057 | Product | Stream schedule partial | | `open` |
| BUG-058 | CI | Align smoke suite with ads-removed + Next | Block merge on green subset | `open` |

### P3 — later / ideas

| ID | Area | Issue | Notes | Status |
|----|------|-------|-------|--------|
| BUG-080 | Ads | Google IMA / AdSense for video preroll | Only after display ads work + approval | `open` |
| BUG-081 | Live | Real RTMP ingest + HLS playback | Large infra | `open` |
| BUG-082 | Money | Stripe Connect creator payouts | | `open` |
| BUG-083 | Growth | Email/push notification delivery | | `open` |
| BUG-084 | Creator | Kick/Twitch parity remaining “planned” rows | See `creatorStudioCatalog.js` | `open` |
| BUG-085 | SEO | ISR/revalidate for popular watch pages | | `open` |
| BUG-086 | i18n | Localization | Chrome top-10 + guest language; body copy still EN — see BUG-124 | `partial` |
| BUG-126 | UX | Cloud env banner on every page in misconfigured env | Dismissible; expected without Supabase keys | `open` |
| BUG-127 | Idea | Guest-mode banner + richer auth prompts | P3 polish from 2026-08-27 QA | `open` |
| BUG-087 | Mobile | Native apps | | `open` |

---

## Done (recent)

| ID | Issue | PR | Date |
|----|-------|-----|------|
| BUG-007 | Production `calabi.us` is Next.js on Render Node (`clips-app-2jlx.onrender.com`; `x-render-origin-server: Render`; `/api/health` 200). Do not re-add a Static Site. | verified live | 2026-08-30 |
| BUG-091 | Clips open sideways: object `routeId` already stringified (#169); Next `globals.css` now has `scrollbar-gutter: stable`; catalog hydrate re-applies `/id` so shorts are not stuck on `/watch` | #169 + ship-ready | 2026-08-30 |
| BUG-092 | Taste picker / banners / messy create — picker gone; Create is format chips; upload is YT-style details | #169 | 2026-08-27 |
| BUG-114 | Homepage scroll — App shell `h-dvh` + `main` `overflow-y-auto` (Apex home is in-flow, not a locked stage) | #169 | 2026-08-27 |
| BUG-115 | Square boxes over circular avatars — `button.rounded-full` / `data-avatar-btn`; remaining home/watch/pics wrappers tagged | #169 + ship-ready | 2026-08-30 |
| BUG-116 | Client exception / failed resource after deploys — `global-error` + `calabi_chunk_reload`; required `[...slug]` not `[[...slug]]` | #169 | 2026-08-27 |
| BUG-117 | Admin Close session removed; Money nav is Stripe ledger + Pay creators | #169 | 2026-08-27 |
| BUG-121 | Wallet/Settings keep the site left rail (`studioChrome` excludes them) | #169 | 2026-08-27 |
| BUG-020 | Upload limit errors shown before/at publish (clip 60s / video 24h) | ship-ready | 2026-08-30 |
| BUG-119 | `/rewards` known view + alias to Wallet | #176 + ship-ready | 2026-08-30 |
| BUG-001 | Production uploads confirmed after Next env fix | owner check | 2026-08-26 |
| BUG-003 | `videos` catalog has live rows; drop static sitemap override | #110 | 2026-08-26 |
| BUG-113 | Next SEO finish: all known routes have App Router pages + metadata | #109 | 2026-08-26 |
| BUG-005 | SpaShell route peel / Next SEO rebuild | #103–#109 | 2026-08-26 |
| BUG-112 | Next SEO Phase 3: section routes + NextNavContext | #107 | 2026-08-26 |
| BUG-006 | Client nav synced to Next App Router | #107 | 2026-08-26 |
| BUG-111 | Next SEO Phase 2: SSR About/Help/Legal + content article HTML + sitemap ids | #106 | 2026-08-26 |
| BUG-100 | Supabase env empty in browser after Next migrate (uploads looked unsaved) | #104 | 2026-08-26 |
| BUG-101 | Next.js App Router Phase 1 (SEO foundation, Node Render) | #103 | 2026-08-26 |
| BUG-102 | AdSense client script in `index.html` head | #102 (draft/open) | — |
| BUG-103 | Error report from failure UI | #96 | 2026-08-26 |
| BUG-104 | Header: logo replaces hamburger; remove wordmark | #97 | 2026-08-26 |
| BUG-105 | Remove sidebar footer logo | #98 | 2026-08-26 |
| BUG-106 | Full-size clip/pic scroll ads (later removed with ExoClick strip) | #92 | 2026-08-25 |
| BUG-107 | Creator delete posts | #91 | 2026-08-25 |
| BUG-108 | Upload catalog columns / “Couldn't upload” | #88–#90 | 2026-08-25 |
| BUG-109 | Stop WebM re-encode breaking iOS clip play | main | 2026-08-26 |
| BUG-110 | Ads system removed (no-op modules) | main | 2026-08-26 |

---

## Won’t fix

| ID | Issue | Reason |
|----|-------|--------|
| — | Keep ExoClick VAST as primary | Product moved off ExoClick |
| BUG-012 | AdSense monetization path | Decided: no ads; tips/premium/Cash→Coins only. Still accurate — do not re-enable inventory sales without a product flip of `FEATURE_ADS`. |
| BUG-013 | Wire AdSense clip/pic units | Cancelled with BUG-012 |

### Triage note (2026-08-26)

Ads-related wontfix (**BUG-012/013**) remain correct: no in-stream/VAST inventory is sold. **AdvertisePage** is being rewritten on `cursor/do-500-batch-09e7` to an interest / partnership form (no VAST or “inventory for sale” claims). Prefer Coins, tips, and premium until ads are explicitly re-enabled.

---

## Next 5 to pull (suggested order)

1. **BUG-010** — Live ingest (RTMP/HLS) — only after a second device can play HLS; keep `liveIngestFlagOn` false until then  
2. **BUG-016** — Own payouts / admin withdraw (Stripe Express stays off)  
3. **BUG-053** — MFA enroll flow spot-check on cloud  
4. **BUG-021** — iOS original-file upload regression test  
5. **BUG-040** — Quarantine or fix flaky named-activity smoke

---

## Add a bug (template)

Copy into the right priority table:

```text
| BUG-xxx | Area | Short title | Extra detail / file hints | `open` |
```

Rules:
- One concrete problem per row when possible  
- Link a PR when status → `doing`  
- Never delete history — move to Done / Won’t fix  

Last updated: 2026-08-30 (BUG-021/022/023/048 cluster in flight)

### Product foundations (shipped partial — need ingest/OAuth/Stripe Cash SKUs)

| ID | Area | Issue | Notes | Status |
|----|------|-------|-------|--------|
| BUG-060 | Cash | Calabi Cash wallets + web tiers | Cloud `wallets` + Fliff packs + Gold Coins (0016); Stripe Payment Links still optional | `doing` |
| BUG-061 | Live | Pools / Ghost AI / PvP challenges | `0013_live_feature_state` + pull/push when table exists | `partial` |
| BUG-062 | Live | Group streams + raids | Invite/request UI; ingest multi-host TBD | `partial` |
| BUG-063 | Studio | Calabi Studio CapCut parity | Trim/filters/avatar/shell; cloud encode TBD | `partial` |
| BUG-064 | Social | Multi-stream + one-tap post | Connect mocks; real YT/TikTok OAuth TBD | `partial` |
| BUG-065 | Escrow | Donation-request admin release | Admin Payouts/Live tab | `partial` |
