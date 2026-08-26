/**
 * Smoke for platform differentiators — Calabi Cash, pools, challenges, studio.
 */
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'

const cash = readFileSync('src/lib/calabiCash.js', 'utf8')
assert.match(cash, /CALABI_CASH_PER_USD = 100/)
assert.match(cash, /units: 300/)
assert.match(cash, /units: 1150/)
assert.match(cash, /units: 6000/)

const stripe = readFileSync('src/lib/stripeConfig.js', 'utf8')
assert.match(stripe, /getCalabiCashPaymentLink/)
assert.match(stripe, /VITE_STRIPE_CASH_LINK_T1/)

assert.equal(existsSync('supabase/migrations/0013_live_feature_state.sql'), true)
assert.equal(existsSync('src/lib/liveFeatureSync.js'), true)

const split = readFileSync('src/lib/revenueSplit.js', 'utf8')
assert.match(split, /CREATOR_REV_SHARE = 0\.8/)

const pools = readFileSync('src/lib/livePools.js', 'utf8')
assert.match(pools, /startPool/)
assert.match(pools, /contributeToPool/)

const challenges = readFileSync('src/lib/liveChallenges.js', 'utf8')
assert.match(challenges, /Ghost AI/)
assert.match(challenges, /3 \* 60 \* 1000/)
assert.match(challenges, /ghostUsedThisHour/)

const group = readFileSync('src/lib/groupStreams.js', 'utf8')
assert.match(group, /GROUP_STREAM_WARN_AT = 6/)
assert.match(group, /autoSplitRevenue/)

const raids = readFileSync('src/lib/liveRaids.js', 'utf8')
assert.match(raids, /raidToStream/)

const escrow = readFileSync('src/lib/donationEscrow.js', 'utf8')
assert.match(escrow, /adminReleaseEscrow/)
assert.match(escrow, /fulfilled_pending_admin/)

const social = readFileSync('src/lib/socialConnects.js', 'utf8')
assert.match(social, /youtube/)
assert.match(social, /tiktok/)
assert.match(social, /queueClipPost/)

assert.equal(existsSync('src/components/CalabiStudioPage.jsx'), true)
assert.equal(existsSync('src/components/LiveHostTools.jsx'), true)
assert.equal(existsSync('src/components/CalabiCashShop.jsx'), true)
assert.equal(existsSync('app/calabi-studio/page.jsx'), true)
assert.equal(existsSync('app/calabi-cash/page.jsx'), true)

const live = readFileSync('src/components/LiveView.jsx', 'utf8')
assert.match(live, /LiveHostTools/)
assert.match(live, /CalabiCashShop/)

const chat = readFileSync('src/components/LiveChatPanel.jsx', 'utf8')
assert.match(chat, /tipWithCalabiCash/)
assert.match(chat, /requestText/)

const ads = readFileSync('src/lib/adEngine.js', 'utf8')
assert.match(ads, /ADSENSE_KEEP_STREAM_PIP/)

console.log('differentiators-smoke: ok')
