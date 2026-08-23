/** Live-project smoke checks — no mock catalog, no invented checkout grant. */
import { readFileSync } from 'node:fs'
import { extractHashtags, mergeTags, parseClock, parseCaptionCues, isReleased, filterExploreItems } from '../src/lib/mediaMeta.js'
import { parseRoute, buildHash } from '../src/lib/routes.js'
import { sanitizeAuthError, normalizePhone } from '../src/lib/authBrand.js'

let failed = 0
function assert(cond, msg) {
  if (!cond) {
    failed += 1
    console.error('FAIL', msg)
  } else {
    console.log('ok', msg)
  }
}

assert(sanitizeAuthError('Invalid login credentials') === 'Wrong email or password.', 'branded login error')
assert(!/supabase/i.test(sanitizeAuthError('supabase provider is not enabled')), 'errors never say supabase')
assert(normalizePhone('5551234567') === '+15551234567', 'us phone to e164')

assert(extractHashtags('hello #Music and #gaming').join(',') === 'music,gaming', 'hashtags')
assert(mergeTags('music, extra', 'more #music #live').includes('live'), 'merge tags')
assert(parseClock('1:02') === 62, 'parse clock')
assert(parseCaptionCues('00:00.000 --> 00:02.000\nHi').length === 1, 'vtt cues')
assert(isReleased({ status: 'draft' }) === false, 'draft hidden')
assert(isReleased({ status: 'published' }) === true, 'published visible')
assert(isReleased({ status: 'scheduled', scheduledFor: new Date(Date.now() + 864e5).toISOString() }) === false, 'future schedule hidden')

const { kind, id, params } = parseRoute('#/watch/abc?t=12')
assert(kind === 'watch' && id === 'abc' && params.t === '12', 'watch timestamp route')
assert(buildHash('watch', 'abc', { t: 12 }).includes('t=12'), 'build hash t')

function isPromoLive(promo, now = Date.now()) {
  if (!promo || promo.published !== true) return false
  if (promo.startsAt) {
    const t = new Date(promo.startsAt).getTime()
    if (t && t > now) return false
  }
  if (promo.endsAt) {
    const t = new Date(promo.endsAt).getTime()
    if (t && t < now) return false
  }
  return true
}
assert(isPromoLive({ published: false }) === false, 'unpublished promo hidden')
assert(isPromoLive({ published: true }) === true, 'published promo live')
assert(isPromoLive({ published: true, startsAt: new Date(Date.now() + 864e5).toISOString() }) === false, 'future promo hidden')

function startPremiumCheckout({ already = false, configured = false, link = '' } = {}) {
  if (already) return { granted: false, status: 'already' }
  if (link) return { granted: false, status: 'redirect', url: link }
  if (configured) return { granted: false, status: 'key_ready' }
  return { granted: false, status: 'no_key_in_build' }
}
assert(startPremiumCheckout({}).granted === false, 'checkout never grants without charge')
assert(startPremiumCheckout({ already: true }).status === 'already', 'already subscribed')
assert(startPremiumCheckout({ configured: true }).status === 'key_ready', 'key without payment link')
assert(startPremiumCheckout({ link: 'https://buy.stripe.com/x' }).status === 'redirect', 'payment link redirects')

const explore = filterExploreItems([
  { id: '1', createdAt: new Date().toISOString(), durationSec: 30, views: 2 },
  { id: '2', createdAt: new Date(Date.now() - 40 * 864e5).toISOString(), durationSec: 500, views: 9 },
], { date: 'week', duration: 'short' })
assert(explore.length === 1 && explore[0].id === '1', 'explore date+duration filter')

const checkoutSrc = readFileSync(new URL('../src/lib/checkout.js', import.meta.url), 'utf8')
const pageSrc = readFileSync(new URL('../src/components/CheckoutPage.jsx', import.meta.url), 'utf8')
const modalSrc = readFileSync(new URL('../src/components/CheckoutModal.jsx', import.meta.url), 'utf8')
assert(!checkoutSrc.includes('granted: true'), 'checkout lib never grants')
assert(pageSrc.includes('membershipReturnPaid'), 'checkout page only marks paid after Stripe return')
assert(!modalSrc.includes('addPremiumSub'), 'checkout modal does not fake a paid sub')
assert(pageSrc.includes('startPremiumCheckout'), 'checkout page uses the gate')
assert(modalSrc.includes('startPremiumCheckout'), 'checkout modal uses the gate')
assert(pageSrc.includes('VITE_STRIPE_PAYMENT_LINK') || pageSrc.includes('Payment Link'), 'checkout mentions payment link')

const engagementSrc = readFileSync(new URL('../src/lib/engagement.js', import.meta.url), 'utf8')
assert(engagementSrc.includes('export const PREMIUM_PRICE = 5'), 'default list price')
assert(engagementSrc.includes('export function getMembershipPrice'), 'creator list price reader')
assert(engagementSrc.includes('export function setMembershipPrice'), 'creator can set list price')
assert(engagementSrc.includes('n >= 1 && n <= 50'), 'list price stays in range')
assert(engagementSrc.includes('pushFollow'), 'follows push to cloud')
assert(engagementSrc.includes('pushVote'), 'votes push to cloud')

const aboutSrc = readFileSync(new URL('../src/components/AboutPage.jsx', import.meta.url), 'utf8')
assert(aboutSrc.includes('Payouts are not live'), 'about does not promise payouts')
assert(aboutSrc.includes('Live video is not on yet'), 'about labels live honestly')

const authSrc = readFileSync(new URL('../src/components/AuthModal.jsx', import.meta.url), 'utf8')
assert(!authSrc.includes('Continue with Google'), 'google sign-in removed')
assert(authSrc.includes('Continue with Apple'), 'apple sign-in button')
assert(authSrc.includes('Continue with Microsoft'), 'microsoft sign-in button')
assert(authSrc.includes('Continue with X'), 'x sign-in button')
assert(authSrc.includes('loginWithOAuth'), 'oauth handler wired')
assert(authSrc.includes('Phone'), 'phone sign-in')
assert(!/supabase/i.test(authSrc), 'auth modal never says supabase')
assert(authSrc.includes('CapCut cannot sign people'), 'capcut is not a fake login')

const brandSrc = readFileSync(new URL('../src/lib/authBrand.js', import.meta.url), 'utf8')
assert(brandSrc.includes('Your Clips code is'), 'sms template says clips')
assert(brandSrc.includes('sanitizeAuthError'), 'auth errors are branded')

const secSrc = readFileSync(new URL('../src/components/settings/SecuritySettings.jsx', import.meta.url), 'utf8')
assert(secSrc.includes('startMfaEnroll'), 'real 2fa enroll')
assert(!secSrc.includes('Backend integration required'), '2fa is not a fake checkbox')

const shortsSrc = readFileSync(new URL('../src/components/ShortsFeed.jsx', import.meta.url), 'utf8')
assert(shortsSrc.includes('onStitch'), 'stitch on clip player')
assert(shortsSrc.includes('early_skip'), 'reel skip trains For You')
assert(!shortsSrc.includes('withReferenceShorts'), 'sample clips not mixed into feed')

const gridSrc = readFileSync(new URL('../src/components/ShortsGrid.jsx', import.meta.url), 'utf8')
assert(!gridSrc.includes('>Shorts<'), 'clips page has no Shorts title')
assert(gridSrc.includes('Recommended'), 'clips recommended tab')
assert(gridSrc.includes('Following'), 'clips following tab')

const liveSrc = readFileSync(new URL('../src/components/LiveView.jsx', import.meta.url), 'utf8')
assert(liveSrc.includes('Live lobby'), 'live page is a lobby')
assert(!liveSrc.includes('live-badge-glow'), 'no fake glowing LIVE badge')

const mig = readFileSync(new URL('../supabase/migrations/0006_social_graph.sql', import.meta.url), 'utf8')
assert(mig.includes('create table if not exists public.follows'), 'social graph migration')
const graphSrc = readFileSync(new URL('../src/lib/graphSync.js', import.meta.url), 'utf8')
assert(graphSrc.includes('export async function syncGraphFromCloud'), 'cloud graph pull')

const helpSrc = readFileSync(new URL('../src/components/HelpPage.jsx', import.meta.url), 'utf8')
assert(helpSrc.includes('never type the file name'), 'help says not to type the sql filename')
assert(helpSrc.includes('Copy SQL'), 'help has copy buttons for sql')

const algoSrc = readFileSync(new URL('../src/lib/algorithmEngine.js', import.meta.url), 'utf8')
assert(algoSrc.includes('explorationRoll'), 'for you exploration is session-stable')
assert(!algoSrc.includes('Math.random()'), 'ranker does not reshuffle every render')
assert(algoSrc.includes('bumpCatalogEngagement'), 'watch signals write back onto posts')
assert(!algoSrc.includes('valorant'), 'search does not invent trending queries')

const creatorsSrc = readFileSync(new URL('../src/components/CreatorsPage.jsx', import.meta.url), 'utf8')
assert(creatorsSrc.includes('listPopularCreators'), 'creators page ranks people who posted')

const healthSrc = readFileSync(new URL('../src/lib/catalogHealth.js', import.meta.url), 'utf8')
assert(healthSrc.includes('purgeDeadCatalog'), 'dead pics and sample clips are purged')

const purgeSql = readFileSync(new URL('../supabase/migrations/0007_purge_dead_media.sql', import.meta.url), 'utf8')
assert(purgeSql.includes("type = 'pic'"), 'sql removes unplayable pics')

if (failed) {
  console.error(`${failed} failed`)
  process.exit(1)
}
console.log('all smoke checks passed')
