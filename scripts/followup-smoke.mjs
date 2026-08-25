/**
 * Smoke checks for follow-up audit items — no Vite imports needed.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const adEngine = readFileSync('src/lib/adEngine.js', 'utf8')
const vastAds = readFileSync('src/lib/vastAds.js', 'utf8')
const watchPage = readFileSync('src/components/WatchPage.jsx', 'utf8')
const liveIngest = readFileSync('src/lib/liveIngest.js', 'utf8')
const org = readFileSync('src/lib/orgConfig.js', 'utf8')
const liveAds = readFileSync('src/lib/liveAds.js', 'utf8')

assert.match(org, /productName: 'calabi'/)
assert.match(adEngine, /viewerWantsAds/)
assert.match(vastAds, /setVastViewerShowAds/)
assert.match(vastAds, /clips_ad_settings/)
assert.doesNotMatch(watchPage, /skipPreroll/)
assert.match(liveIngest, /LIVE_INGEST_CONNECTED/)
assert.equal(liveAds.includes('LIVE_VIEWER_AD_DELAY_SEC = 30'), true)

console.log('followup-smoke: ok')
