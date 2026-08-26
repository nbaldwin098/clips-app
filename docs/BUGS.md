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

| ID | Area | Issue | Notes | Status |
|----|------|-------|-------|--------|
| BUG-001 | Cloud / uploads | Confirm production uploads work after Next env fix (#104) | Owner confirmed uploads stick after refresh on Node deploy | `done` |
| BUG-002 | Storage | Confirm public bucket named exactly `clips` exists | Migration `0003_clips_storage_bucket.sql`; user confirmed | `done` |
| BUG-003 | Catalog | Confirm `videos` table still has rows after migrate | Live SSR titles for `/FoHGp57XPSB`, `/ZVD42PXmSuI`, org posts; removed stale `public/sitemap.xml` that hid dynamic sitemap | `done` |
| BUG-004 | Auth | CS1 / owner cloud login edge cases still fragile | Owner is kiddnixk (gmail); cs1 aliases removed | `done` |
| BUG-005 | Next / SEO | SpaShell still owns most routes | Finish PR: every known path has App Router page + metadata; SpaShell remains client UI bridge | `done` |
| BUG-006 | Next / nav | Client `pushState` routing vs Next App Router | Done in #107 (`NextNavContext` + `router.push`) | `done` |
| BUG-007 | Deploy | Old Static Render service must stay deleted/suspended | Domain only on Node web service | `open` |
| BUG-008 | Smoke | `live-smoke.mjs` still asserts removed ExoClick/VAST behavior | Smoke rewritten for no-op stubs + deleted ad modules | `done` |
| BUG-090 | Auth | Admin unlock broken; owner still treated as cs1 on live | #121 + #124 | `done` |
| BUG-091 | Clips | Clips open glitched sideways (object routeId) | openClip + scrollbar-gutter | `doing` |
| BUG-092 | UX | Taste picker / banners / messy create | Removed picker; avatars; YT-style upload filters | `doing` |

### P1 — important

| ID | Area | Issue | Notes | Status |
|----|------|-------|-------|--------|
| BUG-010 | Live | Live ingest not connected — lobby only | Gate on `VITE_LIVE_INGEST_CONNECTED`; OBS/RTMP/HLS still missing | `open` |
| BUG-011 | Live | Host ad controls / liveAds stubs after ads removal | LiveView + Stream settings controls removed; thin stubs kept for advertise portal | `done` |
| BUG-012 | Ads | Decide monetization path: AdSense vs none vs later video ads | Product decision: no ads for now; tips/premium/Cash | `wontfix` |
| BUG-013 | Ads | Wire AdSense units for clip-feed + pic-feed if keeping AdSense | Cancelled with BUG-012 | `wontfix` |
| BUG-014 | Creator Studio | Setup hub / earnings / apply badge not on `main` | Studio hub + grouped rail shipped | `doing` |
| BUG-015 | Creator Studio | Orphan AnalyticsPage / channel branding duplication | Settings grouped template; Account uses SettingsTemplates | `doing` |
| BUG-016 | Payouts | Manual payouts only; no Stripe Connect | Honest copy exists; Connect still planned | `open` |
| BUG-017 | SEO | Dynamic sitemap for public content ids | Done in #106 | `done` |
| BUG-018 | SEO | Server-render real HTML for About/Help/Legal bodies | Done in #106 | `done` |
| BUG-019 | Watch | Share OG tags depend on Supabase row fetch | Soft unavailable + article HTML in #106 | `done` |
| BUG-020 | Uploads | Clip 60s / video 24h limits — confirm UX errors are clear | Limits enforced in `publishLocalMedia` | `open` |
| BUG-021 | iOS | Keep original-file upload path (no WebM re-encode) | Fixed once; add regression test so it doesn’t return | `open` |
| BUG-022 | Delete | Cloud delete path for admin/creator — verify on Node deploy | Recent fixes around `deleteCatalogItem` + storage remove | `open` |
| BUG-023 | Chat | Live chat cloud sync reliability | `liveChatSync.js`; test multi-device | `open` |
| BUG-024 | Feed | Endless clip/pic scroll edge cases | Prior PRs fixed stalls; re-verify after Next | `open` |
| BUG-028 | Home | All/Videos/Shorts/Pics chips + empty “No posts yet” | #111 + #112 hydrate/early sync | `done` |
| BUG-025 | Error reports | ErrorReportPrompt shipped — confirm tickets show in Admin | PR #96 | `open` |
| BUG-026 | Header | Logo-only header / no hamburger — confirm mobile sidebar OK | #97/#98 | `open` |
| BUG-027 | Open PRs | Close or rebase stale drafts #93, #101, #102, #58, #71 | Closed; merged branches deleted | `done` |

### P2 — cleanup & quality

| ID | Area | Issue | Notes | Status |
|----|------|-------|-------|--------|
| BUG-040 | Tests | Flaky `test-named-activity.mjs` (“browser fallback likes…”) | Pre-existing; quarantine or fix | `open` |
| BUG-041 | Tests | Add Playwright/browser smoke for upload → play | String smoke isn’t enough | `open` |
| BUG-042 | Dead code | Remove no-op ad modules or finish AdSense replacement | Deleted AdUnits/ExoClick/VAST hooks; thin `adEngine`/`vastAds`/`liveAds` stubs remain for advertise portal + smoke | `done` |
| BUG-043 | Dead code | Remove Vite path when Next peel is complete | Keep `build:vite` until SpaShell gone | `open` |
| BUG-044 | Knip | Run `npm run knip` and clear new unused after Next | | `open` |
| BUG-045 | Docs | Update AdminSetup / Help for Node deploy + no hamburger | Help already partly updated | `open` |
| BUG-046 | Env | Document required Render env vars for Node service | Checklist in this file or AdminSetup | `open` |
| BUG-047 | Dual write | Any remaining local-only media paths | Cloud is source of truth | `open` |
| BUG-048 | Security | Review RLS on `videos` + storage policies after bucket recreate | | `open` |
| BUG-049 | Perf | First Load JS ~255kB SpaShell — code-split peeled routes | | `open` |
| BUG-050 | A11y | Live chat `aria-live` — spot-check after Next | | `open` |
| BUG-051 | Legal | Terms still say “Clips” in places — brand to calabi | Done in #106 | `done` |
| BUG-052 | Product | Notifications: no push/email yet | In-app only | `open` |
| BUG-053 | Product | 2FA / MFA gate — verify import + flow on Next | Past missing-import bug | `open` |
| BUG-054 | Product | VOD library is device-local metadata | `vods` + `stream_settings` tables in 0016; wire sync next | `doing` |
| BUG-055 | Product | Concurrent viewer graph missing | Audience network map in Analytics (#123); concurrent live graph still open | `partial` |
| BUG-088 | Studio | Bubble map invented tally bubbles / no pan / no people | Shipped in #123 | `done` |
| BUG-089 | Catalog | Post “posted at” drifted on updates | `first_published_at` + 0015 in #123 — run SQL in Supabase | `done` |
| BUG-093 | Studio | Creator dashboard empty / wallet wrong place / no earnings | Earnings + stream/VODs in studio; wallet under Site settings; cloud economy 0016–0017 | `doing` |
| BUG-094 | Engagement | Likes/views/premium not updating tallies / bubble map empty | Vote→tally trigger + content_views + premium_subs in 0016; ensureUpvote logs | `doing` |
| BUG-095 | Live | Global chat vs creator chat | global_live_chat 0017; LiveChatPanel switches on focus | `doing` |
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
| BUG-086 | i18n | Localization | | `open` |
| BUG-087 | Mobile | Native apps | | `open` |

---

## Done (recent)

| ID | Issue | PR | Date |
|----|-------|-----|------|
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
| BUG-012 | AdSense monetization path | Decided: no ads; tips/premium/Cash only |
| BUG-013 | Wire AdSense clip/pic units | Cancelled with BUG-012 |

---

## Next 5 to pull (suggested order)

1. **BUG-010** — Live ingest (RTMP/HLS)  
2. **BUG-016** — Stripe Connect payouts  
3. **BUG-014 / BUG-015** — Finish studio/settings polish after hub PR  
4. **BUG-053** — MFA enroll flow spot-check on cloud  
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

Last updated: 2026-08-26 (platform differentiators foundations: Cash, pools, Ghost AI, Studio)

### Product foundations (shipped partial — need ingest/OAuth/Stripe Cash SKUs)

| ID | Area | Issue | Notes | Status |
|----|------|-------|-------|--------|
| BUG-060 | Cash | Calabi Cash wallets + web tiers | Cloud `wallets` + Fliff packs + Gold Coins (0016); Stripe Payment Links still optional | `doing` |
| BUG-061 | Live | Pools / Ghost AI / PvP challenges | `0013_live_feature_state` + pull/push when table exists | `partial` |
| BUG-062 | Live | Group streams + raids | Invite/request UI; ingest multi-host TBD | `partial` |
| BUG-063 | Studio | Calabi Studio CapCut parity | Trim/filters/avatar/shell; cloud encode TBD | `partial` |
| BUG-064 | Social | Multi-stream + one-tap post | Connect mocks; real YT/TikTok OAuth TBD | `partial` |
| BUG-065 | Escrow | Donation-request admin release | Admin Payouts/Live tab | `partial` |
