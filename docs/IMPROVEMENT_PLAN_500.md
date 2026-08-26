# calabi — 500 fixes & improvements plan

Living engineering/product backlog of **500** concrete fixes and improvements for calabi.us (clips-app).
Grounded in `docs/BUGS.md`, `PRODUCT_BACKLOG.md`, creator studio catalog, and current code surfaces.

## How to use

1. Pick the next item by priority: **live ingest / money / data integrity** before polish.
2. Prefer one small PR per item (or tight cluster).
3. When starting: add/link a `BUG-xxx` in `docs/BUGS.md` if it isn’t there.
4. When shipped: check the box here and move the bug to Done.
5. Do **not** revive ads (ExoClick/VAST/AdSense units) — product decision is tips / premium / Coins.

| Range | Theme |
|------:|-------|
| 1–20 | 1. Reliability & P0 (deploy, auth, data) |
| 21–55 | 2. Live ingest, lobby & playback |
| 56–85 | 3. Live chat, mods & community |
| 86–125 | 4. Creator Studio shell & Calabi Studio |
| 126–150 | 5. Analytics & bubble maps |
| 151–185 | 6. Monetization, Coins, tips, payouts |
| 186–225 | 7. Feeds: Home, Clips, Pics, Watch, Explore |
| 226–255 | 8. Upload, media, catalog & storage |
| 256–280 | 9. Auth, profiles, security & privacy |
| 281–305 | 10. DMs & notifications |
| 306–335 | 11. Admin, CS, safety & marketplace ops |
| 336–350 | 12. Ads marketing shells & monetization honesty |
| 351–380 | 13. SEO, Next.js, performance & architecture |
| 381–410 | 14. Testing, CI, docs & ops |
| 411–435 | 15. Mobile web, a11y, i18n & native |
| 436–474 | 16. UX polish & design consistency |
| 475–500 | 17. Differentiator features (pools, Ghost, raids, studio) |

---

## 1. Reliability & P0 (deploy, auth, data)

- [ ] **001.** Confirm old Static Render service stays deleted so domain only hits Node (BUG-007)
- [ ] **002.** Verify cloud delete for creator/admin posts removes storage objects on production (BUG-022)
- [ ] **003.** Add regression test that iOS uploads never re-encode to WebM (BUG-021)
- [ ] **004.** Confirm ErrorReportPrompt tickets appear in Admin support desk (BUG-025)
- [ ] **005.** Spot-check MFA enroll/verify flow on Next deploy (BUG-053)
- [ ] **006.** Audit Supabase RLS on videos + clips storage after bucket recreate (BUG-048)
- [ ] **007.** Document every required Render env var for Node web service (BUG-046)
- [ ] **008.** Heal catalog when Supabase returns empty without wiping paid prices
- [ ] **009.** Fail loudly when NEXT_PUBLIC_SUPABASE_* missing in browser (no silent local-only mode)
- [ ] **010.** Add health endpoint that checks Supabase + Stripe + storage reachability
- [ ] **011.** Prevent routeId object stash from sideways-layout clip opens (BUG-091 residual)
- [ ] **012.** Ensure SpaShell hydration never blanks first paint on /clips and /watch
- [ ] **013.** Add deploy checklist: migrations applied vs AdminSetup SQL list
- [ ] **014.** Alert when wallet_ledger write fails after Stripe coin credit
- [ ] **015.** Alert when contentSync pull fails for >5 minutes
- [ ] **016.** Guard against double-credit on Stripe return refresh
- [ ] **017.** Confirm claimStripeReturn is idempotent across tabs
- [ ] **018.** Lock owner/admin unlock path so non-owners never see Admin
- [ ] **019.** Verify guest device id survives cache clear for unique views
- [ ] **020.** Add backup restore dry-run for catalogBackup before any mass repair

## 2. Live ingest, lobby & playback

- [ ] **021.** Ship real RTMP ingest + HLS playback (BUG-081 / BUG-010)
- [ ] **022.** Wire VITE_LIVE_INGEST_CONNECTED only when media server is actually up
- [ ] **023.** Replace lobby-only live with real viewer count from ingest
- [ ] **024.** Browser screen-share path: stabilize getDisplayMedia → publish
- [ ] **025.** OBS stream key rotation + revoke without breaking live session
- [ ] **026.** Multi-host group streams need shared ingest rooms (BUG-062)
- [ ] **027.** Raid target picker + handoff when destination accepts
- [ ] **028.** End lobby should clean presence for all viewers
- [ ] **029.** Live player buffering UI when HLS stalls
- [ ] **030.** Auto-recover HLS on 404/playlist refresh
- [ ] **031.** Picture-in-picture for live player
- [ ] **032.** Low-latency vs standard HLS quality toggle
- [ ] **033.** Mobile portrait live layout with chat drawer
- [ ] **034.** Host tools: mute audio track without ending lobby
- [ ] **035.** Host tools: disconnect one viewer (mod kick sync)
- [ ] **036.** Stream health meter (bitrate/dropped frames) for host
- [ ] **037.** Scheduled go-live reminder when schedule exists
- [ ] **038.** VOD auto-archive only when real recording file exists
- [ ] **039.** Stop creating empty VOD rows when ingest is off
- [ ] **040.** Concurrent live viewer time-series graph (BUG-055)
- [ ] **041.** Show ‘lobby’ vs ‘on air’ badge consistently in LiveView + profile
- [ ] **042.** Live category/tags for discovery
- [ ] **043.** Featured live row on home when anyone is truly live
- [ ] **044.** Ghost mode / Ghost AI needs real presence + fairness rules (BUG-061)
- [ ] **045.** PvP challenge state machine: challenge → accept → settle
- [ ] **046.** Pool/donation pool UI polish when live_feature_state missing
- [ ] **047.** Graceful empty state when live_feature_state migration not applied
- [ ] **048.** Live thumbnail from last keyframe or creator avatar
- [ ] **049.** Clip-from-live button once recordings exist
- [ ] **050.** Raid announcement in chat with deep link
- [ ] **051.** Group stream layout tiles for 2–4 hosts
- [ ] **052.** Bandwidth warning before starting screen share on cellular
- [ ] **053.** Auto end lobby after N minutes of no host presence
- [ ] **054.** Live chat slow-mode defaults per channel
- [ ] **055.** Test multi-device live presence race conditions

## 3. Live chat, mods & community

- [ ] **056.** Hardening live chat cloud sync multi-device (BUG-023)
- [ ] **057.** Migrate channelStaff.js from localStorage to cloud (BUG-096)
- [ ] **058.** Mod action audit log (timeout/ban/delete) in cloud
- [ ] **059.** Timeout durations presets + custom
- [ ] **060.** Ban appeal flow into Admin support
- [ ] **061.** Chat message report → Admin safety queue
- [ ] **062.** Custom emotes upload + CDN hosting (BUG-056)
- [ ] **063.** Subscriber-only / follower-only chat modes that actually gate
- [ ] **064.** Chat badges for verified, mod, VIP, member tiers
- [ ] **065.** Reply-to-message threads in live chat
- [ ] **066.** Pinned chat message by host
- [ ] **067.** Chat search in host tools for last 24h
- [ ] **068.** Global chat room rate limits under load
- [ ] **069.** Ensure global chat composer never hides when no channel focused
- [ ] **070.** Bot !rules and custom commands cloud-synced across devices
- [ ] **071.** Remove leftover ad slash-command copy from help
- [ ] **072.** aria-live polite region for new chat messages (BUG-050)
- [ ] **073.** Chat font size accessibility setting
- [ ] **074.** Block list syncs to chat filter client + server
- [ ] **075.** Auto-mod keyword lists per channel
- [ ] **076.** Link preview or link strip option for chat
- [ ] **077.** Emoji picker with platform + custom sets
- [ ] **078.** Chat hold-to-show timestamp on mobile
- [ ] **079.** Delete-own-message within 2 minutes
- [ ] **080.** Mod delete shows tombstone not silent vanish
- [ ] **081.** Community posts migrate off local-only youtubeParity
- [ ] **082.** Community feed pagination + cloud RLS
- [ ] **083.** Community post images use same storage bucket rules
- [ ] **084.** News tab: creator newspapers vs platform news separation
- [ ] **085.** News compose validation for empty paragraphs

## 4. Creator Studio shell & Calabi Studio

- [ ] **086.** Finish CapCut-parity trim/filters with cloud encode (BUG-063)
- [ ] **087.** Drafts & schedule: real publish-at scheduler not simple list
- [ ] **088.** Schedule calendar UI for posts + streams (BUG-057)
- [ ] **089.** Go-live from Calabi Studio end-to-end when ingest ready
- [ ] **090.** Unify AnalyticsPage vs CreatorStudio analytics (BUG-015)
- [ ] **091.** Finish studio hub polish: earnings/apply badge on main (BUG-014)
- [ ] **092.** Content library bulk select + bulk visibility
- [ ] **093.** Content library bulk delete with intentional confirm
- [ ] **094.** Drag-reorder featured posts on channel
- [ ] **095.** Thumbnail picker from video frames
- [ ] **096.** Title/description AI assist without inventing fake metrics
- [ ] **097.** Studio overview KPIs match Analytics numbers (single source)
- [ ] **098.** Remove stale ‘Wallet & Cash’ catalog labels → Coins
- [ ] **099.** Controls/Stream buttons discoverability in Lab
- [ ] **100.** Lab: undo/redo for trim edits
- [ ] **101.** Lab: export project JSON for recovery
- [ ] **102.** Lab: crash recovery for in-progress edits
- [ ] **103.** Avatar overlay tools persist to cloud profile
- [ ] **104.** Studio empty states when zero posts
- [ ] **105.** Studio mobile layout for analytics map
- [ ] **106.** Keyboard shortcuts cheat sheet in Studio
- [ ] **107.** Post visibility public/private toggle from Content tab
- [ ] **108.** Scheduled post timezone display
- [ ] **109.** Failed upload retry queue in Studio
- [ ] **110.** Cross-post detector UI when duplicate title/hash
- [ ] **111.** Studio socials: honest OAuth connect buttons (BUG-064)
- [ ] **112.** Disable ‘Publish’ until OAuth tokens exist
- [ ] **113.** One-tap multi-platform post after OAuth
- [ ] **114.** AI highlight stub → real clip suggestion or remove CTA
- [ ] **115.** Studio notifications settings mirror account notifications
- [ ] **116.** Creator apply status badge accuracy
- [ ] **117.** Verified badge progress checklist clarity
- [ ] **118.** VOD channel sync from stream_settings + vods tables (BUG-054)
- [ ] **119.** VOD playback page with chapters
- [ ] **120.** Clip-from-VOD editor entry point
- [ ] **121.** Session management list of active creator devices
- [ ] **122.** Kick/Twitch parity: close remaining planned catalog rows (BUG-084)
- [ ] **123.** Studio rail: collapse state remembered
- [ ] **124.** Prevent Studio from remounting map on every tick
- [ ] **125.** Debounce realtime analytics refresh

## 5. Analytics & bubble maps

- [ ] **126.** Remove invented tally bubbles permanently (regression guard)
- [ ] **127.** Post bubble: performance with 10k+ people (cap + sample UI)
- [ ] **128.** Site bubble: facet Views remains truthful under heavy events
- [ ] **129.** Concurrent live viewers chart separate from audience map
- [ ] **130.** Export analytics CSV for date range
- [ ] **131.** Revenue vs engagement correlation chart (honest, no fake RPM)
- [ ] **132.** Realtime analytics: fix any Sync button regressions
- [ ] **133.** Bubble map: pinch-zoom on trackpads/touch
- [ ] **134.** Bubble map: double-click reset view
- [ ] **135.** Bubble map: keyboard pan (arrows)
- [ ] **136.** Filter chips show counts without second legend
- [ ] **137.** Time scrubber accessibility (aria values)
- [ ] **138.** Selected post persists when switching Analytics ↔ Content
- [ ] **139.** Stats page stop leaning on localStorage engagement keys
- [ ] **140.** Server-side taste aggregation for home ranking
- [ ] **141.** Wire recordInteraction gaps if any player still misses events
- [ ] **142.** Unique views vs total views glossary in UI
- [ ] **143.** Follower vs premium subscriber breakdown everywhere consistent
- [ ] **144.** Geographic heat only if privacy-safe aggregation exists — else don’t fake
- [ ] **145.** Referrer sources if available from share links
- [ ] **146.** Post-level tip total on analytics row
- [ ] **147.** Alert when bubble layout fails empty bounds
- [ ] **148.** Site bubble: search people/nodes
- [ ] **149.** Analytics range presets: 24h / 7d / 28d / lifetime
- [ ] **150.** Compare two posts side-by-side

## 6. Monetization, Coins, tips, payouts

- [ ] **151.** Stripe Connect onboarding for creators (BUG-016 / BUG-082)
- [ ] **152.** Auto payouts after Connect (replace manual-only)
- [ ] **153.** Coin pack Stripe Payment Links always configured in prod
- [ ] **154.** Orders tab: pull full wallet_ledger from cloud every visit
- [ ] **155.** Orders tab: receipt email after pack purchase
- [ ] **156.** Refund path for coin packs (admin)
- [ ] **157.** Tips never unlock premium without checkout return (keep smoke)
- [ ] **158.** Membership checkout deep-link return UX polish
- [ ] **159.** Creator pricing page for tips/TTS/membership amounts
- [ ] **160.** TTS purchase flow end-to-end test
- [ ] **161.** Donation escrow release polish in Admin (BUG-065)
- [ ] **162.** Escrow timeout auto-release policy documented
- [ ] **163.** Payout method vault: bank routing encryption verify
- [ ] **164.** Crypto withdraw addresses validate checksums (SOL/BTC)
- [ ] **165.** Withdraw request status notifications
- [ ] **166.** Earnings daily series gaps fill with zeros (already) — add weekly rollup
- [ ] **167.** Platform fee display on creator earnings
- [ ] **168.** Tax form / 1099 placeholder section when US payouts ship
- [ ] **169.** Prevent double withdraw requests while pending
- [ ] **170.** Coins spend in chat: bigger message actually renders larger
- [ ] **171.** Coins spend: highlight message style
- [ ] **172.** Coins spend: unlock creator emoji/GIF gate
- [ ] **173.** Balance chip in navbar refreshes after purchase return
- [ ] **174.** First-time coin buyer education tooltip (non-spammy)
- [ ] **175.** Currency localization for pack prices
- [ ] **176.** Failed checkout error copy maps Stripe codes
- [ ] **177.** Webhook handler for checkout.session.completed → credit coins
- [ ] **178.** Idempotency keys on all Stripe webhooks
- [ ] **179.** Admin payout CSV export
- [ ] **180.** Creator revenue settings: clarify tips vs membership vs coins
- [ ] **181.** Remove obsolete Calabi Cash naming in remaining strings
- [ ] **182.** Marketplace escrow: buyer/seller dispute states (BUG-098)
- [ ] **183.** Shop listing photos size limits + CDN
- [ ] **184.** Seller portal order fulfillment statuses
- [ ] **185.** Marketplace fees transparent at checkout

## 7. Feeds: Home, Clips, Pics, Watch, Explore

- [ ] **186.** Endless clip scroll: re-verify stall cases after Next (BUG-024)
- [ ] **187.** Endless pic scroll: same
- [ ] **188.** Home chips All/Videos/Clips/Pics empty states stay honest
- [ ] **189.** Hourly Hits stage: verify ranking uses all views not last-hour-only
- [ ] **190.** Hourly Hits: pause auto-advance on hover/focus
- [ ] **191.** Hourly Hits: a11y for arrows
- [ ] **192.** Watch page: theater / default / mini consistency
- [ ] **193.** Watch page: chapters if description timestamps
- [ ] **194.** Watch page: related rail quality (taste-aware)
- [ ] **195.** Watch later / liked / history cloud sync completeness
- [ ] **196.** Library tabs performance with large history
- [ ] **197.** Explore search: debounce + cancel in-flight
- [ ] **198.** Explore: origin chips truthfulness
- [ ] **199.** Clip double-tap like feedback
- [ ] **200.** Clip hold-to-speed / scrub
- [ ] **201.** Clip sound page deep links
- [ ] **202.** Pic lightbox keyboard nav
- [ ] **203.** Pic heart vs like naming consistency
- [ ] **204.** Following feed: shorts-only toggle clarity
- [ ] **205.** Watch again: exclude private/deleted
- [ ] **206.** Home preload next N media without thrashing
- [ ] **207.** Avoid playing muted autoplay where policy blocks — show tap CTA
- [ ] **208.** Feed card skeleton matching final layout (CLS)
- [ ] **209.** Share sheet: short link copy success toast
- [ ] **210.** Open Graph image generation for clips without thumb
- [ ] **211.** 404 soft-unavailable for deleted content shares
- [ ] **212.** Tag pages: pagination + SEO titles
- [ ] **213.** Creator cards on home: open profile not video when avatar clicked
- [ ] **214.** Cross-device continue watching
- [ ] **215.** Reduce layout jump when docked mini-player appears
- [ ] **216.** Mini-player: quality remember
- [ ] **217.** Clips: vertical safe-area on notched phones
- [ ] **218.** Pics: prevent cloud-delete-on-error regressions
- [ ] **219.** Feed health: hide broken media without nuking catalog
- [ ] **220.** Algorithm: exploration vs exploitation slider for power users (hidden)
- [ ] **221.** Seed→tier graduation visibility for creators (optional)
- [ ] **222.** Block muted/blocked creators from all feeds
- [ ] **223.** NSFW / maturity rating flags if needed by policy
- [ ] **224.** Report content from every surface
- [ ] **225.** Save to playlist from watch/clip

## 8. Upload, media, catalog & storage

- [ ] **226.** Clearer UX errors for 60s clip / 24h video limits (BUG-020)
- [ ] **227.** Client transcoder via ffmpeg.wasm for oversized uploads
- [ ] **228.** Unified Video Manager table across drafts/scheduled/live/VOD
- [ ] **229.** Upload progress per-file with cancel
- [ ] **230.** Resume interrupted uploads (tus or multipart)
- [ ] **231.** Image compression path document + apply for pics
- [ ] **232.** HEIC → JPEG conversion on iOS/macOS uploads
- [ ] **233.** Corrupt file detection before publish
- [ ] **234.** Duplicate file hash warning
- [ ] **235.** Storage quota meter for creators
- [ ] **236.** Admin storage cost table stay admin-only
- [ ] **237.** Intentional delete always snapshots catalogBackup
- [ ] **238.** Backup restore UI only for owners (keep out of Stats)
- [ ] **239.** Purge dead catalog jobs scheduled
- [ ] **240.** Unhide broken media after URL heal
- [ ] **241.** Visibility private stays off public feeds (regression tests)
- [ ] **242.** first_published_at never drifts on title edits
- [ ] **243.** Hashtag extraction + tag pages keep working
- [ ] **244.** Public id collision handling
- [ ] **245.** Sitemap includes only public feedable items
- [ ] **246.** CDN cache headers for clips bucket
- [ ] **247.** Signed URL expiry for private media
- [ ] **248.** Virus/malware scan hook for uploads (future)
- [ ] **249.** Max resolution caps with friendly downscale offer
- [ ] **250.** Audio-only upload rejection with clear message
- [ ] **251.** Subtitle/caption upload (.vtt) support
- [ ] **252.** Auto-generate captions (future API)
- [ ] **253.** Thumbnail custom crop tool
- [ ] **254.** Multi-file upload queue ordering
- [ ] **255.** Drag-drop upload on Studio Content

## 9. Auth, profiles, security & privacy

- [ ] **256.** Session list revoke remote sessions
- [ ] **257.** Password change invalidates other sessions
- [ ] **258.** Passkeys / WebAuthn option
- [ ] **259.** OAuth Google/Apple sign-in (if product wants)
- [ ] **260.** Email verification required before monetization
- [ ] **261.** Handle change cooldown + uniqueness
- [ ] **262.** Profile banner/avatar size limits + crop
- [ ] **263.** Profile tabs: Clips label consistency
- [ ] **264.** Profile private account mode
- [ ] **265.** Block/mute user from profile
- [ ] **266.** Data export includes DMs metadata (not other party secrets)
- [ ] **267.** Clear local data doesn’t delete cloud account
- [ ] **268.** GDPR delete account hard-delete pipeline
- [ ] **269.** Age gate if required by region
- [ ] **270.** Security settings: login alerts (email when shipped)
- [ ] **271.** Device trust naming
- [ ] **272.** CAPTCHA on auth after N failures
- [ ] **273.** Rate limit sign-up by IP
- [ ] **274.** Owner login: keep cloud-only (no local owner fallback)
- [ ] **275.** cs1 aliases stay removed
- [ ] **276.** Legal pages brand consistency (calabi not Clips)
- [ ] **277.** Cookie / local storage disclosure accuracy
- [ ] **278.** Privacy: analytics events scrub PII
- [ ] **279.** DMCA takedown form → Admin copyright queue
- [ ] **280.** Copyright strike counter for creators

## 10. DMs & notifications

- [ ] **281.** DMs: read receipts reliability
- [ ] **282.** DMs: typing indicators
- [ ] **283.** DMs: image attach with same storage rules
- [ ] **284.** DMs: report conversation
- [ ] **285.** DMs: block user ends thread
- [ ] **286.** DMs: search messages
- [ ] **287.** DMs: unread badge accuracy on navbar
- [ ] **288.** DMs: push notification when app backgrounded (BUG-083)
- [ ] **289.** In-app notification preferences granular (BUG-052)
- [ ] **290.** Email digests: weekly creator stats
- [ ] **291.** Email: tip received
- [ ] **292.** Email: payout sent
- [ ] **293.** Email: live from following
- [ ] **294.** Push: live from following
- [ ] **295.** Push: DM received
- [ ] **296.** Notification center: mark all read
- [ ] **297.** Notification deep links always land correctly
- [ ] **298.** Mute notification category per creator
- [ ] **299.** Digest quiet hours
- [ ] **300.** SMS opt-in later (P3)
- [ ] **301.** Notification copy tone pass (no spammy)
- [ ] **302.** Ensure notifications table RLS
- [ ] **303.** Bell dropdown Show more → full page
- [ ] **304.** Admin broadcast notification tool (careful)
- [ ] **305.** Failed mail: never show demo codes in production builds

## 11. Admin, CS, safety & marketplace ops

- [ ] **306.** Finish CS/mod templates + support desk analytics (BUG-099)
- [ ] **307.** Support ticket SLA timers
- [ ] **308.** Ticket assignment to agents
- [ ] **309.** Canned responses library
- [ ] **310.** People search by email/handle/id
- [ ] **311.** People: force logout
- [ ] **312.** People: shadowban
- [ ] **313.** Content: bulk unpublish
- [ ] **314.** Safety: ID check Accept/Deny audit trail
- [ ] **315.** Safety: appeal workflow
- [ ] **316.** Promos: schedule start/end
- [ ] **317.** News: platform editorial workflow
- [ ] **318.** Payouts admin: mark paid with tx id
- [ ] **319.** Live admin: escrow tools copy → real actions
- [ ] **320.** Shop admin: dispute resolution UI
- [ ] **321.** Setup tab: migration status checklist automated
- [ ] **322.** Admin audit log of all privileged actions
- [ ] **323.** Role separation: support vs safety vs finance
- [ ] **324.** Rate limit admin APIs
- [ ] **325.** Impersonate-user debug mode (owner only, audited)
- [ ] **326.** Abuse score heuristics for spam accounts
- [ ] **327.** Auto-flag sudden tip chargebacks
- [ ] **328.** Marketplace inventory moderation
- [ ] **329.** Seller KYC gate before payouts
- [ ] **330.** Admin search across tickets+people+content
- [ ] **331.** Export compliance report
- [ ] **332.** Ban evasion detection by device id
- [ ] **333.** Geo block list if legal requires
- [ ] **334.** Admin mobile-friendly layouts
- [ ] **335.** Confirm advertise portal can’t create live campaigns while ads removed

## 12. Ads marketing shells & monetization honesty

- [ ] **336.** Rewrite AdvertisePage to match no-ads product reality
- [ ] **337.** Rewrite or sunset AdvertiserPortal dead UI
- [ ] **338.** Keep adEngine/vastAds/liveAds as thin stubs or delete + update smoke
- [ ] **339.** Remove AdSense head script if permanently unused
- [ ] **340.** Do not resurrect ExoClick/VAST (wontfix)
- [ ] **341.** Help/FAQ: monetization = tips/premium/coins only
- [ ] **342.** Creator apply: no promised ad RPM
- [ ] **343.** Financial ledger asserts no ad share remain green
- [ ] **344.** If ads return later: new BUG cluster, don’t revive stubs silently
- [ ] **345.** Advertise CTA in footer: hide or retarget to creator monetization
- [ ] **346.** Admin: no Ads tab regression
- [ ] **347.** Smoke: keep asserting deleted AdUnits modules
- [ ] **348.** Marketing site copy audit for ‘run ads’ language
- [ ] **349.** Investor/partner one-pager: revenue mix accurate
- [ ] **350.** Internal flag FEATURE_ADS default false

## 13. SEO, Next.js, performance & architecture

- [ ] **351.** ISR/revalidate for popular watch pages (BUG-085)
- [ ] **352.** Code-split SpaShell peeled routes (BUG-049)
- [ ] **353.** Remove Vite path when SpaShell gone (BUG-043)
- [ ] **354.** Run knip and clear unused (BUG-044)
- [ ] **355.** Middleware: auth gates for private shells
- [ ] **356.** robots.txt allow/disallow audit
- [ ] **357.** Canonical URLs for bare /{id} shares
- [ ] **358.** JSON-LD VideoObject for watch pages
- [ ] **359.** JSON-LD for profiles
- [ ] **360.** Open Graph images absolute HTTPS
- [ ] **361.** Twitter/X card tags
- [ ] **362.** hreflang when i18n ships
- [ ] **363.** Reduce First Load JS shared chunks
- [ ] **364.** Lazy-load CreatorStudio and AdminPortal
- [ ] **365.** Lazy-load bubble map libs
- [ ] **366.** Image component sizing to stop CLS
- [ ] **367.** Font subsetting / display swap
- [ ] **368.** Service worker? (only if careful with auth)
- [ ] **369.** HTTP caching for static Next assets
- [ ] **370.** Prefetch next route on hover for primary nav
- [ ] **371.** Memory leak audit on ShortsFeed unmount
- [ ] **372.** Long task profiling on home
- [ ] **373.** React Compiler follow repo guidance (no needless memo)
- [ ] **374.** Dual write elimination for remaining local media (BUG-047)
- [ ] **375.** Migrate payouts contact + youtubeParity extras to cloud (BUG-096)
- [ ] **376.** Single package.json script matrix cleanup
- [ ] **377.** TypeScript gradual adoption for lib/economy*
- [ ] **378.** ESLint a11y plugin enable
- [ ] **379.** Bundle analyzer in CI monthly
- [ ] **380.** Edge config for maintenance mode page

## 14. Testing, CI, docs & ops

- [ ] **381.** Fix or quarantine flaky test-named-activity.mjs (BUG-040)
- [ ] **382.** Playwright smoke: upload → play (BUG-041)
- [ ] **383.** Playwright: coin checkout return mock
- [ ] **384.** Playwright: live chat two browsers
- [ ] **385.** Align smoke suite with ads-removed + Next (BUG-058)
- [ ] **386.** Reduce brittle includes() smoke where behavior tests exist
- [ ] **387.** CI: block merge on smoke + build
- [ ] **388.** CI: migration SQL lint
- [ ] **389.** Visual regression for navbar/studio
- [ ] **390.** Load test live chat room
- [ ] **391.** Load test contentSync pull
- [ ] **392.** Document PRODUCT_MAP deploy checklist for Node (not Static)
- [ ] **393.** Update Help for logo header / no hamburger (BUG-045)
- [ ] **394.** Update AdminSetup for current migrations through 0022+
- [ ] **395.** OWN_CHECKOUT docs match live Stripe flow
- [ ] **396.** DEPENDENCY_AUDIT quarterly refresh
- [ ] **397.** BUGS.md triage weekly: close stale doing
- [ ] **398.** PRODUCT_BACKLOG.md revive G–L sections or delete stub
- [ ] **399.** Runbook: Stripe webhook failure
- [ ] **400.** Runbook: Supabase outage read-only mode
- [ ] **401.** Feature flag system for risky launches
- [ ] **402.** Staging environment parity with prod
- [ ] **403.** Synthetic uptime checks on / and /clips
- [ ] **404.** Error budget dashboard
- [ ] **405.** Sentry or equivalent client error tracking
- [ ] **406.** Source maps upload for prod
- [ ] **407.** Log redaction for tokens
- [ ] **408.** Backup: nightly catalog snapshot verification
- [ ] **409.** Secret rotation calendar
- [ ] **410.** On-call cheat sheet for owner

## 15. Mobile web, a11y, i18n & native

- [ ] **411.** Mobile sidebar icon rail confirmed OK (BUG-026)
- [ ] **412.** Touch targets ≥44px on primary controls
- [ ] **413.** Safe-area insets on clips/live
- [ ] **414.** Landscape watch controls
- [ ] **415.** iOS Safari video inline playback flags
- [ ] **416.** Android Chrome pip where supported
- [ ] **417.** Reduced motion: respect prefers-reduced-motion on stage/autoplay
- [ ] **418.** Focus rings visible on keyboard nav
- [ ] **419.** Skip-to-content link
- [ ] **420.** Color contrast audit on zinc/amber chips
- [ ] **421.** Form labels not placeholder-only
- [ ] **422.** Live regions for toasts
- [ ] **423.** Screen reader names for CoinIcon buttons
- [ ] **424.** Localization framework (BUG-086)
- [ ] **425.** Locale date/number formatting
- [ ] **426.** RTL layout exploration
- [ ] **427.** Native iOS app keep original upload path (BUG-087 related)
- [ ] **428.** Native Android exploration
- [ ] **429.** PWA install prompt? (product decision)
- [ ] **430.** Offline cached library metadata
- [ ] **431.** Share target API for upload from share sheet
- [ ] **432.** Haptics on like (supported browsers)
- [ ] **433.** Mobile create flow simplify further
- [ ] **434.** Bottom nav consideration vs left rail on phones
- [ ] **435.** Keyboard avoiding viewport on DM composer

## 16. UX polish & design consistency

- [ ] **436.** Global square controls already — audit leftover rounded-full pills
- [ ] **437.** Typography: expressive fonts where branded pages exist; avoid Inter defaults on marketing
- [ ] **438.** About/Help/Advertise first viewport brand-first pass
- [ ] **439.** Remove generic dashboard clutter from marketing pages
- [ ] **440.** Empty states: one job, one CTA
- [ ] **441.** Toast system unify
- [ ] **442.** Modal focus trap audit
- [ ] **443.** Destructive confirm modals consistent
- [ ] **444.** Loading spinners unify
- [ ] **445.** Skeleton screens for Studio earnings
- [ ] **446.** Settings tabs sticky on scroll
- [ ] **447.** Coins shop: pack grid mobile 2-col spacing
- [ ] **448.** Orders empty state CTA → Coins tab
- [ ] **449.** Profile menu: Coins/Orders hierarchy clear
- [ ] **450.** Navbar search square thinner — verify mobile
- [ ] **451.** Notification badge count overflow 9+
- [ ] **452.** Creator Studio: no subtitle microcopy regressions
- [ ] **453.** Stats page: remove leftover backup UI if any
- [ ] **454.** Site bubble: Views facet naming everywhere
- [ ] **455.** Live donate amounts: minimum tip clear
- [ ] **456.** Custom donate amount validation
- [ ] **457.** Follow button optimistic UI rollback on fail
- [ ] **458.** Subscribe vs Follow wording audit
- [ ] **459.** Verified checkmark tooltip
- [ ] **460.** Channel page modules order
- [ ] **461.** Footer links: dead routes audit
- [ ] **462.** 404 page useful next actions
- [ ] **463.** Age of post formatting relative time
- [ ] **464.** Duration badges on videos/clips
- [ ] **465.** Hover previews on home cards (desktop)
- [ ] **466.** Context menus: open in new tab
- [ ] **467.** Drag-drop reorder playlists
- [ ] **468.** Playlist collaborative? (decision)
- [ ] **469.** Sound page UX polish
- [ ] **470.** Tag chip overflow wrapping
- [ ] **471.** News article typography
- [ ] **472.** Community composer polish
- [ ] **473.** Marketplace buyer checkout UX
- [ ] **474.** Seller onboarding checklist

## 17. Differentiator features (pools, Ghost, raids, studio)

- [ ] **475.** Pools: create/join/settle fairness audited
- [ ] **476.** Pools: spectator view
- [ ] **477.** Ghost AI: difficulty tiers transparent
- [ ] **478.** Ghost AI: anti-cheat / rate limits
- [ ] **479.** PvP challenges: spectator chat mode
- [ ] **480.** Raids: cooldown + anti-abuse
- [ ] **481.** Group streams: host permissions
- [ ] **482.** Donation requests: creator approve/deny UX
- [ ] **483.** Escrow: admin release with reason codes
- [ ] **484.** Calabi Studio templates gallery
- [ ] **485.** Creator Lab OBS connect free path clarity
- [ ] **486.** Multi-stream dashboard layouts
- [ ] **487.** One-tap post templates per network
- [ ] **488.** Social analytics after publish (impressions if API allows)
- [ ] **489.** Clip templates trending audio
- [ ] **490.** Green screen / background replace (Lab)
- [ ] **491.** Auto-chapters for long VODs
- [ ] **492.** Highlight reel weekly email
- [ ] **493.** Creator milestones badges
- [ ] **494.** Referral program for creators (optional)
- [ ] **495.** Fan clubs / tiers beyond membership
- [ ] **496.** Channel panels (about/links) Kick parity
- [ ] **497.** Stream markers for later clip
- [ ] **498.** Polls in live chat
- [ ] **499.** Predictions / points (careful gambling laws)
- [ ] **500.** Hype train analogue without copying trademark

---

**Total: 500 items.** Last generated for plan request (2026-08-26).

### Suggested first 15 pulls

1. 001 Confirm Static Render stays dead (BUG-007)
2. 002/022 Production delete + storage verify
3. 032 RTMP/HLS ingest path (BUG-081)
4. 036 Stripe Connect (BUG-016)
5. 023 Live chat multi-device sync (BUG-023)
6. 096 Channel staff → cloud
7. 054 VOD cloud sync
8. 063 CapCut cloud encode
9. 064 Social OAuth publish
10. 041 Playwright upload→play
11. 049 SpaShell code-split
12. Rewrite AdvertisePage honesty
13. 052 Push/email notifications foundation
14. 048 RLS audit
15. 040 Fix flaky named-activity test

