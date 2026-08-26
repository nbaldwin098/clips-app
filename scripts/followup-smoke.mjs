/**
 * Smoke checks for follow-up audit items — no Vite imports needed.
 */
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'

const adEngine = readFileSync('src/lib/adEngine.js', 'utf8')
const vastAds = readFileSync('src/lib/vastAds.js', 'utf8')
const watchPage = readFileSync('src/components/WatchPage.jsx', 'utf8')
const liveIngest = readFileSync('src/lib/liveIngest.js', 'utf8')
const org = readFileSync('src/lib/orgConfig.js', 'utf8')
const liveAds = readFileSync('src/lib/liveAds.js', 'utf8')

assert.match(org, /productName: 'calabi'/)
assert.match(adEngine, /Ads system removed/)
assert.match(vastAds, /VAST ads removed/)
assert.doesNotMatch(watchPage, /useVideoVastAds/)
assert.doesNotMatch(watchPage, /VideoInStreamAd/)
assert.match(liveIngest, /LIVE_INGEST_CONNECTED/)
assert.equal(liveAds.includes('LIVE_VIEWER_AD_DELAY_SEC = 0'), true)
assert.equal(existsSync('src/components/AdUnits.jsx'), false)
assert.equal(existsSync('src/hooks/useVideoVastAds.js'), false)

console.log('followup-smoke: ok')
