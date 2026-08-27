# Clips — Complete Product & Engineering Backlog

CEO directive: execute everything. Track status.

**500-item plan:** [`docs/IMPROVEMENT_PLAN_500.md`](docs/IMPROVEMENT_PLAN_500.md).  
**Infra blockers (RTMP, Connect, OAuth, mail/push, transcode, native, i18n):** [`docs/INFRA.md`](docs/INFRA.md).  
Bugs: [`docs/BUGS.md`](docs/BUGS.md). Ops: [`docs/DEPLOY_CHECKLIST.md`](docs/DEPLOY_CHECKLIST.md), [`docs/RENDER_ENV.md`](docs/RENDER_ENV.md).

Legend: [x] done  [~] partial  [ ] open

## A. Discovery & Algorithm
- [x] Learning machine (taste profiles, adaptive weights)
- [x] Seed → tier graduation by velocity
- [x] Cross-post detector
- [x] recordInteraction feedback API
- [x] Wire recordInteraction into player events (ShortsFeed, WatchPage, PicsPage, ContentCard)
- [ ] Server-side taste aggregation

## B. Authentication
- [x] Dual-role context + localStorage
- [x] Profile save
- [x] Sign-in / sign-up modal UI
- [x] Client password validation
- [x] 2FA scaffold, sessions UI
- [x] Data export JSON
- [x] Clear local data

## C. Settings
- [x] Account, Security, Channel, Stream, Chat, Monetization, Copyright, Notifications, Roles, Analytics, Legal

## D. Surfaces
- [x] Home, Shorts, Live, Studio, Wallet, Explore, Library (history/liked/saved/imports), Help, Legal pages, Footer

## E. Upload & Import
- [x] Import modal + cross-post + save
- [x] Upload modal (local inspect, compression path documented)
- [ ] Full client transcoder (ffmpeg.wasm)
- [ ] Unified Video Manager table

## F. Live
- [x] Stream key UI
- [~] Live player, chat, widgets (lobby + chat sync; RTMP/HLS ingest still open)

## G. Money & Coins
- [x] Coin packs + Orders tab (Cash→Coins catalog labels)
- [x] Own Stripe Checkout Session path
- [~] Escrow (donation requests + marketplace 7-day release) — timeout policy documented
- [ ] Stripe Connect creator payouts

## H. Ads & advertise honesty
- [x] Product ads off (`FEATURE_ADS = false`); ExoClick/VAST removed
- [x] AdvertisePage / AdvertiserPortal honesty — no inventory sales; tips/premium/Coins CTAs
- [ ] Optional AdSense later only if product re-enables ads (new BUG cluster — do not revive stubs)

## I. Creator Studio
- [x] Studio shell / hub / earnings apply
- [~] CapCut/OBS lab tools
- [ ] Real multi-platform OAuth publish

## J. Trust & Admin
- [x] Admin Setup SQL copy blocks
- [x] Support desk + CS macros doc
- [ ] Chargeback automation

## K. Platform / ops
- [x] Next.js App Router + Node Render deploy
- [x] `/api/health` env presence check
- [x] Render env + deploy checklist docs
- [ ] Playwright upload→play smoke

## L. A11y & SEO
- [x] robots disallow / sectionMeta noindex for private shells
- [x] Skip-to-content + prefers-reduced-motion + live chat aria-live
- [ ] Full keyboard audit on watch/clips
