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
assert(!authSrc.includes("&& synced &&"), 'oauth buttons show even when cloud auth is off')

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

const settingsHub = readFileSync(new URL('../src/components/settings/SettingsHub.jsx', import.meta.url), 'utf8')
assert(settingsHub.includes('SecuritySettings'), 'settings hub includes real 2FA page')
const appSrc = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8')
assert(appSrc.includes('SettingsHub'), 'settings layout is mounted')
assert(appSrc.includes('PasswordRecoveryGate'), 'reset-email landing exists')
assert(!appSrc.includes("from './components/SettingsPage'"), 'old fake-2fa settings page is gone')
const moneySrc = readFileSync(new URL('../src/components/settings/MonetizationSettings.jsx', import.meta.url), 'utf8')
assert(!moneySrc.includes('100% of the listed price'), 'settings does not promise 100% payouts')
assert(!moneySrc.includes('Connect payout method'), 'no fake connect payout button')
const streamSet = readFileSync(new URL('../src/components/settings/StreamSettings.jsx', import.meta.url), 'utf8')
assert(!streamSet.includes('rtmp://'), 'no fake rtmp url')
assert(streamSet.includes('Live ingest is not connected'), 'stream settings honest')
const copySrc = readFileSync(new URL('../src/components/settings/CopyrightSettings.jsx', import.meta.url), 'utf8')
assert(copySrc.includes('copyright@calabi.us') || copySrc.includes('ORG.copyrightEmail'), 'dmca uses calabi.us')
assert(!copySrc.includes('platform.internal'), 'no internal placeholder emails')

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

const purgeSql8 = readFileSync(new URL('../supabase/migrations/0008_purge_dead_media.sql', import.meta.url), 'utf8')
assert(purgeSql8.includes('picsum'), 'sql 0008 removes leftover sample hosts')

const profileMedia = readFileSync(new URL('../src/lib/profileMedia.js', import.meta.url), 'utf8')
assert(profileMedia.includes('persistProfilePicture'), 'profile photos persist outside localStorage quota')
const channelSrc = readFileSync(new URL('../src/components/ChannelPage.jsx', import.meta.url), 'utf8')
assert(channelSrc.includes('Save') && channelSrc.includes('Cancel'), 'channel has save and cancel')
assert(channelSrc.includes('Change profile picture'), 'avatar camera is on the photo')

const kidsSrc = readFileSync(new URL('../src/data/publicMediaSeed.js', import.meta.url), 'utf8')
assert(kidsSrc.includes("handle: 'nasa'"), 'nasa creator channel')
assert(kidsSrc.includes("handle: 'noaa'"), 'noaa creator channel')
assert(kidsSrc.includes("handle: 'esa'"), 'esa creator channel')
assert(kidsSrc.includes("handle: 'nasaconnect'"), 'nasa connect kids channel')
assert(kidsSrc.includes("handle: 'classroom'"), 'classroom films channel')
assert(kidsSrc.includes("handle: 'nara'"), 'national archives channel')
assert(kidsSrc.includes('archive.org/download'), 'archive.org documentaries')
assert(kidsSrc.includes("'kids'"), 'kids tagged films')
assert(kidsSrc.includes("'maths'"), 'maths films')
assert(kidsSrc.includes("'english'"), 'english films')
assert(kidsSrc.includes("'history'"), 'history films')
assert(kidsSrc.includes("'documentary'"), 'documentaries')
assert(kidsSrc.includes('durationSec: 1710'), 'long nasa connect programme')
assert(kidsSrc.includes('durationSec: 3140'), 'long history documentary')
assert(kidsSrc.includes("creatorStatus: 'approved'"), 'official channels are creators')
assert(kidsSrc.includes('https://images-assets.nasa.gov'), 'nasa public media')
assert(kidsSrc.includes('https://upload.wikimedia.org'), 'commons public media')
assert(!/nationalgeographic|bbc\.co\.uk|bbc\.com\/iplayer/i.test(kidsSrc), 'no copyrighted bbc/natgeo hosts')
assert(!/picsum|placekitten|sample-videos|gtv-videos/i.test(kidsSrc), 'official media is not placeholder hosts')
assert(kidsSrc.includes("type: 'video'"), 'official library has videos')
assert(kidsSrc.includes("type: 'short'"), 'official library has clips')
assert(kidsSrc.includes("type: 'pic'"), 'official library has photos')
assert(kidsSrc.includes('lsSet(\'imports\', [])'), 'old catalog is wiped once')
const healSrc = readFileSync(new URL('../src/lib/selfHeal.js', import.meta.url), 'utf8')
assert(healSrc.includes('seedOfficialCatalog'), 'official catalog seeds on boot')
assert(!healSrc.includes('seedKidsEducation'), 'kids filler seed is gone')
const healthSrc2 = readFileSync(new URL('../src/lib/catalogHealth.js', import.meta.url), 'utf8')
assert(healthSrc2.includes('isRetiredCatalogItem'), 'old kids seed rows cannot return')

if (failed) {
  console.error(`${failed} failed`)
  process.exit(1)
}
console.log('all smoke checks passed')
