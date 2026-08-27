# calabi — 500 fixes & improvements plan

Living engineering/product backlog of **500** concrete fixes and improvements for calabi.us (clips-app).
Grounded in `docs/BUGS.md`, `PRODUCT_BACKLOG.md`, creator studio catalog, and current code surfaces.

## Progress

**101 / 500** checked in-repo this batch. Blocked items (RTMP, Stripe Connect, OAuth publish, push/email, ffmpeg.wasm, native, full i18n) stay open until infra exists.

## How to use

1. Pick next by priority: **live ingest / money / data integrity** before polish.
2. Prefer one small PR per item (or tight cluster).
3. When starting: link a `BUG-xxx` in `docs/BUGS.md` if missing.
4. When shipped: check the box and move the bug to Done.
5. Do **not** revive ads (ExoClick/VAST/AdSense units) — tips / premium / Coins only.

| Range | Theme |
|------:|-------|
| 1–20 | 1. Reliability & P0 |
| 21–50 | 2. Live ingest, lobby & playback |
| 51–80 | 3. Live chat, mods & community |
| 81–110 | 4. Creator Studio & Calabi Studio |
| 111–135 | 5. Analytics & bubble maps |
| 136–165 | 6. Monetization, Coins, tips, payouts |
| 166–195 | 7. Feeds: Home, Clips, Pics, Watch, Explore |
| 196–220 | 8. Upload, media, catalog & storage |
| 221–245 | 9. Auth, profiles, security & privacy |
| 246–270 | 10. DMs & notifications |
| 271–295 | 11. Admin, CS, safety & marketplace |
| 296–310 | 12. Ads shells & monetization honesty |
| 311–335 | 13. SEO, Next.js, performance & architecture |
| 336–360 | 14. Testing, CI, docs & ops |
| 361–385 | 15. Mobile web, a11y, i18n & native |
| 386–410 | 16. UX polish & design consistency |
| 411–435 | 17. Differentiators (pools, Ghost, raids, studio) |
| 436–460 | 18. Discovery, algorithm & growth |
| 461–480 | 19. Dead code, cleanup & honesty |
| 481–500 | 20. Legal, trust, support & business |

---

## 1. Reliability & P0

- [x] **001.** Confirm old Static Render service stays deleted (BUG-007)
- [ ] **002.** Verify cloud delete removes storage objects on prod (BUG-022)
- [x] **003.** Regression test: iOS uploads never re-encode to WebM (BUG-021)
- [ ] **004.** Confirm ErrorReportPrompt tickets show in Admin (BUG-025)
- [ ] **005.** Spot-check MFA enroll/verify on Next (BUG-053)
- [ ] **006.** Audit RLS on videos + clips storage (BUG-048)
- [x] **007.** Document required Render env vars (BUG-046)
- [ ] **008.** Heal empty Supabase catalog without wiping paid prices
- [x] **009.** Fail loudly when NEXT_PUBLIC_SUPABASE_* missing
- [x] **010.** Health endpoint: Supabase + Stripe + storage
- [ ] **011.** Prevent routeId object sideways clip opens
- [ ] **012.** SpaShell hydration never blanks /clips /watch
- [x] **013.** Deploy checklist: migrations vs AdminSetup
- [ ] **014.** Alert on wallet_ledger failure after coin credit
- [x] **015.** Guard double-credit on Stripe return refresh
- [x] **016.** claimStripeReturn idempotent across tabs
- [ ] **017.** Non-owners never see Admin
- [ ] **018.** Guest device id survives cache clear
- [ ] **019.** Catalog backup dry-run before mass repair
- [ ] **020.** Visibilitychange refreshes wallet/catalog safely

## 2. Live ingest, lobby & playback

- [ ] **021.** Ship RTMP ingest + HLS playback (BUG-081 / BUG-010)
- [ ] **022.** VITE_LIVE_INGEST_CONNECTED only when media server up
- [ ] **023.** Real viewer count from ingest (not lobby-only)
- [ ] **024.** Stabilize getDisplayMedia screen-share publish
- [ ] **025.** OBS key rotation/revoke without breaking session
- [ ] **026.** Multi-host group stream ingest rooms (BUG-062)
- [ ] **027.** Raid picker + accept handoff
- [x] **028.** End lobby cleans all viewer presence
- [ ] **029.** HLS stall buffering UI + auto-recover
- [ ] **030.** Picture-in-picture for live
- [ ] **031.** Low-latency vs standard HLS toggle
- [ ] **032.** Mobile portrait live + chat drawer
- [ ] **033.** Host mute audio without ending lobby
- [ ] **034.** Host disconnect viewer synced to mods
- [ ] **035.** Stream health meter (bitrate/drops)
- [ ] **036.** Go-live reminder from schedule
- [x] **037.** VOD archive only when recording exists
- [x] **038.** No empty VOD rows when ingest off
- [ ] **039.** Concurrent live viewer graph (BUG-055)
- [x] **040.** Lobby vs on-air badge consistency
- [ ] **041.** Live categories/tags
- [x] **042.** Featured live on home when truly live
- [ ] **043.** Ghost AI fairness + presence (BUG-061)
- [ ] **044.** PvP challenge → accept → settle
- [x] **045.** Pool UI when live_feature_state missing
- [ ] **046.** Live thumbnail keyframe/avatar
- [ ] **047.** Clip-from-live when recordings exist
- [ ] **048.** Raid chat announcement + deep link
- [ ] **049.** Auto end lobby after host absence
- [ ] **050.** Multi-device presence race tests

## 3. Live chat, mods & community

- [ ] **051.** Harden live chat multi-device sync (BUG-023)
- [ ] **052.** Migrate channelStaff to cloud (BUG-096)
- [ ] **053.** Mod action audit log in cloud
- [ ] **054.** Timeout presets + custom
- [ ] **055.** Ban appeal → Admin support
- [ ] **056.** Chat report → safety queue
- [ ] **057.** Custom emotes upload/hosting (BUG-056)
- [ ] **058.** Sub/follower-only chat that gates
- [ ] **059.** Badges: verified/mod/VIP/member
- [ ] **060.** Reply-to in live chat
- [ ] **061.** Pinned host message
- [ ] **062.** Host chat search 24h
- [ ] **063.** Global chat rate limits
- [x] **064.** Global composer never hides wrongly
- [ ] **065.** Bot commands cloud-synced
- [x] **066.** aria-live chat (BUG-050)
- [ ] **067.** Chat font size a11y
- [ ] **068.** Block list → chat filter
- [ ] **069.** Auto-mod keyword lists
- [ ] **070.** Delete-own-message window
- [ ] **071.** Mod delete tombstones
- [ ] **072.** Community posts off local youtubeParity
- [ ] **073.** Community pagination + RLS
- [ ] **074.** News: creator vs platform separation
- [ ] **075.** Polls in live chat
- [ ] **076.** Donate/sub goal bars
- [ ] **077.** Gift coins chat animation
- [ ] **078.** Emoji-only spam filter
- [ ] **079.** Link strip option
- [ ] **080.** Chat hold-for-timestamp on mobile

## 4. Creator Studio & Calabi Studio

- [ ] **081.** CapCut trim/filters + cloud encode (BUG-063)
- [ ] **082.** Real publish-at scheduler (not simple list)
- [ ] **083.** Schedule calendar posts+streams (BUG-057)
- [ ] **084.** Go-live from Studio when ingest ready
- [ ] **085.** Unify AnalyticsPage vs Studio analytics (BUG-015)
- [ ] **086.** Studio hub earnings/apply badge polish (BUG-014)
- [ ] **087.** Content bulk visibility + intentional delete
- [ ] **088.** Featured posts drag-reorder
- [ ] **089.** Thumbnail from video frames
- [ ] **090.** Overview KPIs == Analytics source
- [x] **091.** Catalog label Cash → Coins
- [ ] **092.** Lab undo/redo + crash recovery
- [ ] **093.** Lab project JSON export
- [x] **094.** Studio empty states
- [ ] **095.** Mobile analytics map layout
- [ ] **096.** Keyboard shortcuts sheet
- [ ] **097.** Visibility toggle from Content
- [ ] **098.** Failed upload retry queue
- [ ] **099.** Social OAuth honesty (BUG-064)
- [ ] **100.** Publish disabled without OAuth
- [ ] **101.** One-tap multi-platform post
- [ ] **102.** AI highlight real or remove CTA
- [ ] **103.** VOD cloud sync (BUG-054)
- [ ] **104.** VOD chapters + clip-from-VOD
- [ ] **105.** Creator device session list
- [ ] **106.** Kick/Twitch planned rows (BUG-084)
- [ ] **107.** Debounce analytics; don’t remount map each tick
- [ ] **108.** Templates gallery
- [x] **109.** OBS connect path clarity
- [ ] **110.** Green screen / stream markers

## 5. Analytics & bubble maps

- [x] **111.** No invented tally bubbles (regression)
- [ ] **112.** Bubble perf at 10k+ people
- [ ] **113.** Site bubble Views truthfulness
- [ ] **114.** Concurrent viewers chart vs audience map
- [ ] **115.** Analytics CSV export
- [ ] **116.** Revenue vs engagement (no fake RPM)
- [ ] **117.** Pinch-zoom + double-click reset + keyboard pan
- [x] **118.** Filter chips without second legend
- [ ] **119.** Time scrubber aria
- [ ] **120.** Selected post persists across tabs
- [ ] **121.** StatsPage leave localStorage engagement
- [ ] **122.** Server-side taste aggregation
- [ ] **123.** Unique vs total views glossary
- [ ] **124.** Follower vs premium consistency
- [ ] **125.** Post tip totals on rows
- [ ] **126.** Ranges 24h/7d/28d/lifetime
- [ ] **127.** Compare two posts
- [ ] **128.** Bubble PNG export
- [ ] **129.** Site bubble node search
- [ ] **130.** Share-link referrers if available
- [ ] **131.** Empty-bounds layout alert
- [ ] **132.** recordInteraction gap audit
- [ ] **133.** Monday creator analytics email
- [ ] **134.** Realtime Sync button never returns
- [ ] **135.** Geographic heat only if privacy-safe — else don’t fake

## 6. Monetization, Coins, tips, payouts

- [ ] **136.** Stripe Connect onboarding (BUG-016 / BUG-082)
- [ ] **137.** Auto payouts after Connect
- [ ] **138.** Coin Payment Links always in prod
- [x] **139.** Orders pulls full wallet_ledger
- [ ] **140.** Orders receipt email
- [ ] **141.** Admin coin-pack refunds
- [ ] **142.** Tips never unlock without Stripe return
- [ ] **143.** Membership return UX
- [ ] **144.** Creator tip/TTS/membership pricing page
- [ ] **145.** TTS purchase E2E test
- [ ] **146.** Donation escrow release (BUG-065)
- [x] **147.** Escrow timeout policy documented
- [ ] **148.** Payout vault encryption verify
- [ ] **149.** Crypto address checksums
- [ ] **150.** Withdraw status notifications
- [ ] **151.** Earnings weekly rollup + fee display
- [ ] **152.** Tax/1099 section when US payouts ship
- [ ] **153.** No double withdraw while pending
- [ ] **154.** Coins: bigger/highlight/GIF gates work
- [x] **155.** Navbar balance after purchase return
- [ ] **156.** Checkout cancel → Coins
- [ ] **157.** Webhook credit coins + idempotency keys
- [ ] **158.** Admin payout CSV
- [x] **159.** Remove obsolete Cash naming
- [ ] **160.** Marketplace escrow disputes (BUG-098)
- [ ] **161.** Shop photos + seller fulfillment + fees
- [ ] **162.** Rate limit tip attempts
- [ ] **163.** Gift memberships
- [ ] **164.** Split tip for collabs
- [ ] **165.** Currency localization for packs

## 7. Feeds: Home, Clips, Pics, Watch, Explore

- [ ] **166.** Endless clip scroll re-verify (BUG-024)
- [ ] **167.** Endless pic scroll re-verify
- [x] **168.** Home chips honest empty states
- [ ] **169.** Hourly Hits all-views ranking + a11y
- [ ] **170.** Pause Hourly Hits on hover/focus
- [ ] **171.** Watch theater/mini consistency
- [ ] **172.** Watch chapters from timestamps
- [ ] **173.** Taste-aware related rail
- [ ] **174.** Library cloud sync complete + perf
- [ ] **175.** Explore debounce/cancel search
- [ ] **176.** Clip double-tap like + scrub
- [ ] **177.** Pic lightbox keyboard
- [ ] **178.** Following shorts-only clarity
- [ ] **179.** Watch again excludes private/deleted
- [ ] **180.** Preload without thrashing
- [ ] **181.** Autoplay-blocked tap CTA
- [ ] **182.** Feed skeletons (CLS)
- [ ] **183.** Share copy toast + OG thumbs
- [ ] **184.** Soft-unavailable deleted shares
- [ ] **185.** Tag pages pagination/SEO
- [ ] **186.** Avatar → profile not video
- [ ] **187.** Continue watching cross-device
- [ ] **188.** Mini-player layout jump
- [ ] **189.** Clips safe-area notches
- [ ] **190.** Pics no delete-on-error
- [x] **191.** Hide broken media safely
- [ ] **192.** Block muted creators everywhere
- [ ] **193.** Report from every surface
- [ ] **194.** Save to playlist
- [ ] **195.** End-screens: clip next / watch replay

## 8. Upload, media, catalog & storage

- [x] **196.** Clearer 60s/24h limit errors (BUG-020)
- [ ] **197.** ffmpeg.wasm client transcoder
- [ ] **198.** Unified Video Manager table
- [ ] **199.** Per-file progress + cancel + resume
- [ ] **200.** HEIC→JPEG on Apple uploads
- [ ] **201.** Corrupt/duplicate detection
- [ ] **202.** Creator storage quota meter
- [ ] **203.** Intentional delete snapshots backup
- [ ] **204.** Scheduled dead-catalog purge
- [ ] **205.** Unhide after URL heal
- [ ] **206.** Private stays off public feeds
- [ ] **207.** first_published_at never drifts
- [x] **208.** Sitemap public-only + lastmod
- [ ] **209.** CDN headers + signed private URLs
- [ ] **210.** Resolution caps with downscale offer
- [x] **211.** Reject audio-only clearly
- [ ] **212.** .vtt captions upload
- [ ] **213.** Thumbnail crop tool
- [ ] **214.** Multi-file queue + drag-drop Studio
- [x] **215.** Default visibility setting
- [ ] **216.** Unlisted + password + embargo posts
- [ ] **217.** Revoke share-link family
- [ ] **218.** Hashtag reliability
- [ ] **219.** Public id collision handling
- [ ] **220.** Image compression for pics

## 9. Auth, profiles, security & privacy

- [ ] **221.** Revoke remote sessions
- [ ] **222.** Password change invalidates sessions
- [ ] **223.** Passkeys/WebAuthn
- [ ] **224.** Email verify before monetization
- [ ] **225.** Handle cooldown + uniqueness
- [ ] **226.** Avatar/banner crop limits
- [ ] **227.** Private account mode
- [ ] **228.** Block/mute from profile
- [ ] **229.** Export own DM metadata only
- [ ] **230.** GDPR hard-delete pipeline
- [ ] **231.** Login alerts when email ships
- [ ] **232.** CAPTCHA after failures + signup IP limit
- [ ] **233.** Owner login stays cloud-only
- [x] **234.** Legal brand = calabi
- [ ] **235.** Scrub PII from analytics events
- [ ] **236.** DMCA → Admin copyright queue
- [ ] **237.** Copyright strike counter
- [ ] **238.** Reserved handles
- [x] **239.** Tighten CSP + noindex private shells
- [ ] **240.** Embed frame-ancestors
- [ ] **241.** Age gate if required
- [ ] **242.** Cookie disclosure accuracy
- [ ] **243.** Blocked words in display names
- [ ] **244.** Profile tabs label consistency
- [x] **245.** Clear local ≠ delete cloud account

## 10. DMs & notifications

- [ ] **246.** DM read receipts + typing
- [ ] **247.** DM image attach rules
- [ ] **248.** DM report + block ends thread
- [ ] **249.** DM search + unread badge
- [ ] **250.** Push background (BUG-083)
- [ ] **251.** Granular in-app prefs (BUG-052)
- [ ] **252.** Emails: stats, tip, payout, live
- [ ] **253.** Pushes: live following + DM
- [ ] **254.** Mark all read + correct deep links
- [ ] **255.** Mute per creator + quiet hours
- [x] **256.** No demo mail codes in prod
- [x] **257.** Bell → full notifications page
- [ ] **258.** Notifications RLS
- [ ] **259.** Delivery retry/backoff
- [ ] **260.** Audited admin broadcast
- [ ] **261.** Notification copy tone
- [ ] **262.** SMS opt-in later (decision)
- [ ] **263.** Digest weekly creator
- [ ] **264.** Failed push metrics
- [ ] **265.** DM rate limits
- [ ] **266.** DM encryption-at-rest confirm
- [ ] **267.** Notification settings in Studio mirror account
- [ ] **268.** Live-from-following email batching
- [ ] **269.** Unsubscribe links in all emails
- [ ] **270.** Device permission UX for push

## 11. Admin, CS, safety & marketplace

- [ ] **271.** CS/mod templates + desk analytics (BUG-099)
- [ ] **272.** Ticket SLA + assignment + canned replies
- [ ] **273.** People search; force logout; shadowban
- [ ] **274.** Content bulk unpublish
- [ ] **275.** ID check audit trail + appeals
- [ ] **276.** Promos schedule; news workflow
- [ ] **277.** Payouts mark-paid with tx id
- [ ] **278.** Live escrow admin real actions
- [ ] **279.** Shop dispute UI + inventory mod
- [ ] **280.** Automated migration checklist
- [ ] **281.** Privileged-action audit log
- [ ] **282.** Support vs safety vs finance roles
- [ ] **283.** Admin API rate limits
- [ ] **284.** Impersonation watermark (owner)
- [ ] **285.** Abuse score + chargeback auto-flag
- [ ] **286.** Seller KYC before payouts
- [ ] **287.** Ban evasion by device
- [ ] **288.** Admin mobile layouts
- [x] **289.** Advertise portal can’t run campaigns
- [x] **290.** Chargeback playbook link
- [ ] **291.** Compliance export
- [ ] **292.** Kill switches: ingest + checkouts
- [ ] **293.** Admin search tickets+people+content
- [ ] **294.** Geo block list if legal requires
- [x] **295.** Support macros for Coins/Orders

## 12. Ads shells & monetization honesty

- [x] **296.** Rewrite AdvertisePage for no-ads reality
- [x] **297.** Sunset or rewrite AdvertiserPortal
- [x] **298.** Stubs or delete ad modules + smoke
- [x] **299.** Remove unused AdSense head script
- [x] **300.** Never revive ExoClick/VAST (wontfix)
- [x] **301.** Help: tips/premium/coins only
- [x] **302.** No promised ad RPM on apply
- [x] **303.** Keep no-ad-share ledger asserts
- [x] **304.** Footer Advertise CTA hide/retarget
- [x] **305.** No Admin Ads tab regression
- [x] **306.** Smoke asserts deleted AdUnits
- [x] **307.** Marketing ‘run ads’ copy audit
- [x] **308.** FEATURE_ADS default false
- [x] **309.** Future ads = new BUG cluster only
- [x] **310.** Revenue-mix one-pager accurate

## 13. SEO, Next.js, performance & architecture

- [ ] **311.** ISR/revalidate popular watch (BUG-085)
- [ ] **312.** Code-split SpaShell routes (BUG-049)
- [ ] **313.** Remove Vite when SpaShell gone (BUG-043)
- [x] **314.** Knip unused cleanup (BUG-044)
- [ ] **315.** Middleware auth for private shells
- [x] **316.** robots + canonical bare /{id}
- [ ] **317.** JSON-LD VideoObject + profiles
- [ ] **318.** HTTPS OG + Twitter cards
- [ ] **319.** Cut First Load JS; lazy Studio/Admin/bubbles
- [x] **320.** Image CLS + font display swap
- [ ] **321.** Prefetch primary nav
- [ ] **322.** ShortsFeed memory leak audit
- [ ] **323.** Home long-task profiling
- [ ] **324.** Kill local media dual-write (BUG-047)
- [ ] **325.** Migrate payouts/parity extras (BUG-096)
- [ ] **326.** TS for economy libs; a11y eslint
- [ ] **327.** Bundle analyzer monthly
- [ ] **328.** Maintenance mode page
- [x] **329.** Sitemap lastmod
- [ ] **330.** API rate limits + versioning
- [ ] **331.** Webhook retry + DLQ
- [ ] **332.** Avoid needless memo (compiler)
- [ ] **333.** Edge config flags
- [ ] **334.** HTTP caching static assets
- [ ] **335.** COOP/COEP review for media

## 14. Testing, CI, docs & ops

- [x] **336.** Fix/quarantine flaky named-activity (BUG-040)
- [ ] **337.** Playwright upload→play (BUG-041)
- [ ] **338.** Playwright coin checkout mock
- [ ] **339.** Playwright two-browser chat
- [x] **340.** Align smoke ads-removed+Next (BUG-058)
- [x] **341.** Fewer brittle includes() smokes
- [ ] **342.** CI: smoke+build gate; SQL lint
- [ ] **343.** Load test chat + contentSync
- [x] **344.** Docs: PRODUCT_MAP Node deploy
- [x] **345.** Help no-hamburger update (BUG-045)
- [x] **346.** AdminSetup latest migrations
- [x] **347.** OWN_CHECKOUT = live Stripe
- [x] **348.** Quarterly DEPENDENCY_AUDIT
- [x] **349.** Weekly BUGS triage
- [x] **350.** Fix PRODUCT_BACKLOG G–L stub
- [x] **351.** Runbooks: Stripe webhook; Supabase outage
- [ ] **352.** Feature flags + staging parity
- [ ] **353.** Uptime synthetics / + /clips
- [ ] **354.** Sentry + source maps + log redaction
- [ ] **355.** Nightly catalog snapshot verify
- [ ] **356.** Secret rotation + on-call sheet
- [ ] **357.** Read-only mode banner
- [ ] **358.** What’s-new after deploy
- [ ] **359.** Visual regression navbar/studio
- [ ] **360.** Error budget dashboard

## 15. Mobile web, a11y, i18n & native

- [x] **361.** Mobile icon rail OK (BUG-026)
- [ ] **362.** Touch targets ≥44px
- [ ] **363.** Safe-area clips/live
- [ ] **364.** Landscape watch controls
- [ ] **365.** iOS inline playback flags
- [x] **366.** prefers-reduced-motion
- [x] **367.** Focus rings + skip link
- [x] **368.** Contrast audit zinc/amber
- [ ] **369.** Labels not placeholders
- [ ] **370.** CoinIcon button names
- [ ] **371.** i18n framework (BUG-086)
- [ ] **372.** Locale dates/numbers
- [ ] **373.** iOS original upload path
- [ ] **374.** Android exploration (BUG-087)
- [ ] **375.** PWA install decision
- [ ] **376.** Share Target uploads
- [ ] **377.** Simplify mobile create
- [ ] **378.** Bottom nav vs rail decision
- [ ] **379.** DM composer keyboard avoid
- [ ] **380.** Haptics on like
- [ ] **381.** Offline library metadata
- [ ] **382.** RTL exploration
- [ ] **383.** Toast live regions
- [ ] **384.** Android PiP
- [ ] **385.** Notch-safe Studio

## 16. UX polish & design consistency

- [x] **386.** No leftover rounded-full vs square system
- [x] **387.** About/Help brand-first viewport
- [x] **388.** Empty states one job/one CTA
- [ ] **389.** Unify toasts/spinners/confirms
- [ ] **390.** Modal focus traps
- [ ] **391.** Studio earnings skeletons
- [x] **392.** Sticky settings tabs
- [x] **393.** Coins/Orders mobile + empty CTA
- [x] **394.** Profile Coins/Orders hierarchy
- [x] **395.** Badge 9+ overflow
- [x] **396.** No Studio subtitle regressions
- [x] **397.** Views naming everywhere
- [ ] **398.** Min tip clarity; Follow rollback
- [x] **399.** Subscribe vs Follow wording
- [x] **400.** Footer dead routes; useful 404
- [ ] **401.** Relative time + duration badges
- [ ] **402.** Home hover previews
- [ ] **403.** Playlist reorder; tag wrap
- [ ] **404.** News typography; market checkout
- [ ] **405.** Seller onboarding checklist
- [ ] **406.** Creator command palette
- [ ] **407.** First upload/live checklists
- [ ] **408.** Empty following suggestions
- [ ] **409.** Verified tooltip; channel module order
- [ ] **410.** Sound page polish; settings search

## 17. Differentiators (pools, Ghost, raids, studio)

- [ ] **411.** Pools fairness + spectator view
- [ ] **412.** Ghost AI tiers + rate limits
- [ ] **413.** PvP spectator chat
- [ ] **414.** Raids cooldown/anti-abuse
- [ ] **415.** Group stream host permissions
- [ ] **416.** Donation request approve/deny
- [ ] **417.** Escrow release reason codes
- [ ] **418.** Multi-stream layouts
- [ ] **419.** Post templates per network
- [ ] **420.** Post-publish social analytics
- [ ] **421.** Creator milestone badges
- [ ] **422.** Channel panels Kick parity
- [ ] **423.** Merch via marketplace
- [ ] **424.** Ticketed lives + PPV polish
- [ ] **425.** Members-only posts/live + badge art
- [ ] **426.** Premieres countdown + chat
- [ ] **427.** Guest star + co-host presets
- [ ] **428.** TTS ducking/voices/limits
- [ ] **429.** VOD chat replay + highlight purchases
- [ ] **430.** Top tippers CRM + CSV
- [ ] **431.** Discord go-live webhook
- [ ] **432.** Optional creator referrals
- [ ] **433.** Stream markers → clips
- [ ] **434.** Hype/goal text customization
- [ ] **435.** Greenroom backstage host chat

## 18. Discovery, algorithm & growth

- [ ] **436.** Server-side taste aggregation job
- [ ] **437.** Cold-start taste onboarding (non-spammy)
- [ ] **438.** Explore trending hashtags + sounds
- [ ] **439.** Creator recommendations beyond mutuals
- [ ] **440.** Because you watched shelf + hide control
- [ ] **441.** Report bad recommendation
- [ ] **442.** Admin seasonal promo shelves
- [ ] **443.** Search: typos, filters, creators tab
- [ ] **444.** Clear search history
- [ ] **445.** Referral links + channel QR
- [ ] **446.** Embed docs match Bubble API
- [ ] **447.** API key rotation + webhook secrets UI
- [ ] **448.** Public changelog + status page
- [ ] **449.** Creator education (tips/coins)
- [ ] **450.** New creator launch checklist
- [ ] **451.** RTMP capacity waitlist
- [ ] **452.** Closed-beta invite codes
- [ ] **453.** Opt-in re-engagement emails
- [ ] **454.** Hide/show shelves preference
- [ ] **455.** Exploration vs exploitation power setting
- [ ] **456.** Seed→tier visibility for creators (optional)
- [ ] **457.** Geo-local discovery if privacy OK
- [ ] **458.** What’s trending for you row
- [ ] **459.** Share attribution analytics
- [ ] **460.** Growth experiments framework

## 19. Dead code, cleanup & honesty

- [x] **461.** Rewrite/delete Advertise inventory claims
- [x] **462.** Remove deprecated ownerLogin paths
- [x] **463.** Remove unused preloadMedia ad helpers
- [x] **464.** Knip unused exports
- [x] **465.** Dedupe smoke ad-removal blocks
- [ ] **466.** Fewer hardcoded owner emails in smoke
- [x] **467.** CommunityPage warn until cloud migrated
- [x] **468.** StatsPage migrate or disclaimer
- [x] **469.** StudioToolsPage beta until scheduler
- [x] **470.** Strip mail demo-codes in prod
- [x] **471.** Catalog status badges accurate
- [x] **472.** PRODUCT_BACKLOG: recordInteraction wire status truth
- [x] **473.** PAGE_LIST vs App drift check
- [x] **474.** Brand CSS variables pass
- [ ] **475.** Prod console.log audit
- [ ] **476.** StrictMode sync double-effect audit
- [ ] **477.** Unused lucide import cleanup
- [ ] **478.** Consolidate CoinIcon
- [x] **479.** iOS folder maintain-or-archive note
- [x] **480.** Drop superseded AdSense smoke asserts

## 20. Legal, trust, support & business

- [ ] **481.** Terms: tips/coins/refunds current
- [ ] **482.** Privacy lists analytics + Stripe
- [ ] **483.** Cookie banner if required
- [ ] **484.** Age-restricted content policy
- [ ] **485.** Creator monetization agreement
- [ ] **486.** Strike/appeal policy page
- [x] **487.** Help FAQ: Coins/Orders + lobby vs RTMP
- [ ] **488.** In-app contact → ticket
- [ ] **489.** Published payout SLA
- [ ] **490.** Fraud/chargeback policy
- [ ] **491.** Record retention schedule
- [ ] **492.** Enterprise API DPA
- [ ] **493.** Accessibility statement
- [ ] **494.** Open-source notices
- [ ] **495.** Incident response playbook
- [ ] **496.** Brand asset kit
- [ ] **497.** Bug bounty soft launch
- [ ] **498.** Transparency report template
- [ ] **499.** Student creator program (optional)
- [x] **500.** Support macros library published

---

**Total: 500 items.** Updated 2026-08-26.

### Suggested first 15 pulls

1. 001 — Static Render stays dead (BUG-007)
2. 021 — RTMP/HLS ingest (BUG-081)
3. ~151 — Stripe Connect (BUG-016)
4. 051 — Live chat sync (BUG-023)
5. 052 — Channel staff → cloud (BUG-096)
6. 081 — CapCut cloud encode (BUG-063)
7. Social OAuth publish (BUG-064)
8. VOD cloud sync (BUG-054)
9. AdvertisePage honesty rewrite
10. SpaShell code-split (BUG-049)
11. Playwright upload→play (BUG-041)
12. Production delete/storage verify (BUG-022)
13. RLS audit (BUG-048)
14. Push/email notifications foundation
15. Fix flaky named-activity test (BUG-040)

