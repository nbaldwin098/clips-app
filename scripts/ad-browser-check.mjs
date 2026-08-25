/**
 * Real-browser ad check. Loads the built site in Chrome and reports, per
 * surface, whether an ad slot exists, whether ExoClick was asked for an
 * ad, and whether that ad actually rendered. Run against `vite preview`:
 *
 *   npx vite preview --port 4173 &
 *   node scripts/ad-browser-check.mjs
 *
 * This is a diagnostic, not part of `npm test` — it needs network access
 * to the ad network and a Chrome binary.
 */
import puppeteer from 'puppeteer-core'

const BASE = process.env.AD_CHECK_BASE || 'http://127.0.0.1:4173'
const CHROME = process.env.CHROME_PATH || '/usr/local/bin/google-chrome'

const seedScript = (origin) => {
  const now = new Date().toISOString()
  // Use a publicly reachable sample so watch/clips actually mount a <video>.
  // A missing /test-video.mp4 makes WatchPage show "Couldn't play" and skip ads.
  const video = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4'
  const mk = (id, type, extra = {}) => ({
    id,
    type,
    title: `Test ${type} ${id}`,
    status: 'published',
    createdAt: now,
    publishedAt: now,
    creatorId: 'user_test',
    userId: 'user_test',
    handle: 'tester',
    displayName: 'Tester',
    ...extra,
  })
  const imports = []
  for (let i = 0; i < 14; i += 1) {
    imports.push(mk(`vid-${i}`, 'video', {
      mediaUrl: video,
      sourceUrl: video,
      thumbUrl: '',
      durationSec: 90,
    }))
  }
  for (let i = 0; i < 24; i += 1) {
    imports.push(mk(`clip-${i}`, 'short', {
      mediaUrl: video,
      sourceUrl: video,
      durationSec: 20,
    }))
  }
  for (let i = 0; i < 24; i += 1) {
    imports.push(mk(`pic-${i}`, 'pic', {
      mediaUrl: 'https://picsum.photos/seed/x/600/600',
      thumbUrl: 'https://picsum.photos/seed/x/300/300',
    }))
  }
  localStorage.setItem('clips_imports', JSON.stringify(imports))
  localStorage.setItem('clips_user', JSON.stringify({
    id: 'user_test', email: 't@t.co', displayName: 'Tester', handle: 'tester', provider: 'local',
  }))
}

function newTracker(page) {
  const hits = { adRequests: [], vast: [], blocked: [], console: [] }
  page.on('request', (req) => {
    const url = req.url()
    if (/magsrv|exoclick|bxcdn|exosrv/i.test(url)) hits.adRequests.push(`${req.method()} ${url.slice(0, 110)}`)
    if (/vast|__vast/i.test(url)) hits.vast.push(url.slice(0, 110))
  })
  page.on('requestfailed', (req) => {
    const url = req.url()
    if (/magsrv|exoclick|bxcdn|exosrv|__vast/i.test(url)) {
      hits.blocked.push(`${url.slice(0, 90)} :: ${req.failure()?.errorText}`)
    }
  })
  page.on('console', (msg) => {
    const t = msg.text()
    if (/error|fail|refus|block/i.test(t)) hits.console.push(t.slice(0, 160))
  })
  page.on('pageerror', (err) => hits.console.push(`PAGEERROR ${String(err).slice(0, 160)}`))
  return hits
}

const slotReport = () => {
  const boxes = [...document.querySelectorAll('.exo-slot')]
  // ExoClick injects the creative as a sibling of the <ins>, so a filled slot
  // is a container holding a non-<ins> element with real size.
  const filledBox = (el) => [...el.children].some((c) => {
    if (c.tagName === 'INS' || c.dataset.adLabel === 'true') return false
    const r = c.getBoundingClientRect()
    return !!c.querySelector('img, iframe, video') || (r.width > 1 && r.height > 1)
  })
  const adVideos = [...document.querySelectorAll('video')].filter((v) => /bxcdn|magsrv|exoclick/i.test(v.currentSrc || v.src || ''))
  return {
    displaySlots: boxes.length,
    displayFilled: boxes.filter(filledBox).length,
    emptyBoxesLeftOnPage: boxes.filter((el) => !filledBox(el)).length,
    videoAdsPlaying: adVideos.length,
    videoAdSrc: adVideos.map((v) => (v.currentSrc || v.src).slice(0, 70)),
    providerLoaded: typeof window.ExoLoader !== 'undefined',
  }
}

async function surface(browser, name, path, { wait = 6000, before, after } = {}) {
  const page = await browser.newPage()
  await page.setViewport({ width: 1280, height: 900 })
  const hits = newTracker(page)
  await page.evaluateOnNewDocument(seedScript, BASE)
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle2', timeout: 45000 }).catch(() => {})
  if (before) await before(page)
  await new Promise((r) => setTimeout(r, wait))
  if (after) await after(page)
  const report = await page.evaluate(slotReport).catch(() => null)
  console.log(`\n=== ${name} (${path}) ===`)
  console.log('slots:', JSON.stringify(report))
  const impressions = hits.adRequests.filter((u) => /vregister|cimp/.test(u)).length
  console.log(`ad network requests: ${hits.adRequests.length} (impressions registered: ${impressions})`)
  hits.adRequests.slice(0, 6).forEach((u) => console.log('  ->', u))
  if (hits.blocked.length) {
    console.log('BLOCKED/FAILED:')
    hits.blocked.slice(0, 6).forEach((u) => console.log('  xx', u))
  }
  if (hits.console.length) {
    console.log('console errors:')
    hits.console.slice(0, 6).forEach((u) => console.log('  !!', u))
  }
  await page.close()
  return { report, hits }
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--autoplay-policy=no-user-gesture-required', '--mute-audio'],
})

await surface(browser, 'PICS mosaic', '/pics')
await surface(browser, 'CLIPS grid', '/clips')
await surface(browser, 'CLIPS player', '/clips/clip-0', { wait: 8000 })
await surface(browser, 'HOME', '/')

// Watch: seek near the 30s break and confirm an in-stream ad starts.
await surface(browser, 'WATCH video (30s break)', '/watch/vid-0', {
  wait: 12000,
  before: async (page) => {
    await new Promise((r) => setTimeout(r, 3500))
    await page.evaluate(() => {
      const v = document.querySelector('video')
      if (v) { v.muted = true; v.currentTime = 27; v.play?.() }
    }).catch(() => {})
  },
  after: async (page) => {
    const adState = await page.evaluate(() => {
      const vids = [...document.querySelectorAll('video')]
      return {
        videoCount: vids.length,
        sources: vids.map((v) => (v.currentSrc || v.src || '').slice(0, 90)),
        adOverlay: !!document.querySelector('.z-30'),
        adBadgeText: [...document.querySelectorAll('span')]
          .filter((s) => /^Ad$|Skip/i.test(s.textContent || ''))
          .map((s) => s.textContent.trim()).slice(0, 4),
      }
    }).catch(() => null)
    console.log('watch ad state:', JSON.stringify(adState))
  },
})

await browser.close()
