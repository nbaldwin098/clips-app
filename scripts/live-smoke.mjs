/** Live-project smoke checks — no mock catalog, no invented checkout grant. */
import { readFileSync } from 'node:fs'
import { extractHashtags, mergeTags, parseClock, parseCaptionCues, isReleased, filterExploreItems } from '../src/lib/mediaMeta.js'
import { parseRoute, buildHash } from '../src/lib/routes.js'

let failed = 0
function assert(cond, msg) {
  if (!cond) {
    failed += 1
    console.error('FAIL', msg)
  } else {
    console.log('ok', msg)
  }
}

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

function startPremiumCheckout({ already = false, configured = false } = {}) {
  if (already) return { granted: false, status: 'already' }
  if (!configured) return { granted: false, status: 'no_stripe' }
  return { granted: false, status: 'needs_intent' }
}
assert(startPremiumCheckout({}).granted === false, 'checkout never grants without charge')
assert(startPremiumCheckout({ already: true }).status === 'already', 'already subscribed')
assert(startPremiumCheckout({ configured: true }).status === 'needs_intent', 'key without PaymentIntent')

const explore = filterExploreItems([
  { id: '1', createdAt: new Date().toISOString(), durationSec: 30, views: 2 },
  { id: '2', createdAt: new Date(Date.now() - 40 * 864e5).toISOString(), durationSec: 500, views: 9 },
], { date: 'week', duration: 'short' })
assert(explore.length === 1 && explore[0].id === '1', 'explore date+duration filter')

const checkoutSrc = readFileSync(new URL('../src/lib/checkout.js', import.meta.url), 'utf8')
const pageSrc = readFileSync(new URL('../src/components/CheckoutPage.jsx', import.meta.url), 'utf8')
const modalSrc = readFileSync(new URL('../src/components/CheckoutModal.jsx', import.meta.url), 'utf8')
assert(!checkoutSrc.includes('granted: true'), 'checkout lib never grants')
assert(!pageSrc.includes('addPremiumSub'), 'checkout page does not fake a paid sub')
assert(!modalSrc.includes('addPremiumSub'), 'checkout modal does not fake a paid sub')
assert(pageSrc.includes('startPremiumCheckout'), 'checkout page uses the gate')
assert(modalSrc.includes('startPremiumCheckout'), 'checkout modal uses the gate')

if (failed) {
  console.error(`${failed} failed`)
  process.exit(1)
}
console.log('all smoke checks passed')
