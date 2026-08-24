/**
 * Clips Advertisement Engine
 * Real campaigns only — no default sample ads blocking playback on empty inventory.
 */
import { lsGet, lsSet } from './storage'
import { safeHttpUrl } from './safeUrl'
import { hashSecret, verifySecret, isHashedSecret } from './secrets'

const AD_APPS_KEY = 'clips_ad_applications'
const ADVERTISERS_KEY = 'clips_advertisers'
const AD_CAMPAIGNS_KEY = 'clips_ad_campaigns'
const AD_SESSION_KEY = 'clips_advertiser_session'
const AD_METRICS_KEY = 'clips_ad_metrics'
const ADS_RUNNING_KEY = 'clips_ads_running'
const AD_SETTINGS_KEY = 'clips_ad_settings'

export const AD_PLACEMENTS = [
  { id: 'video', label: 'Videos', hint: 'YouTube-style skippable preroll on watch' },
  { id: 'clip-banner', label: 'Shorts banner', hint: 'Bar at the bottom of a short video' },
  { id: 'clip-feed', label: 'Shorts in-feed', hint: 'Between short videos as you scroll' },
  { id: 'pic-banner', label: 'Pics banner', hint: 'Bar at the bottom of a photo' },
  { id: 'pic-feed', label: 'Pics in-feed', hint: 'Between photos as you scroll' },
]

export const ALL_PLACEMENTS = AD_PLACEMENTS.map((p) => p.id)

const DEFAULT_AD_SETTINGS = {
  videoPreroll: true,
  clipBanner: true,
  clipInFeed: true,
  picBanner: true,
  picInFeed: true,
  clipFeedEvery: 6,
  picFeedEvery: 6,
  videoSkipAfterSec: 5,
}

export function listAdApplications() {
  return lsGet(AD_APPS_KEY, []) || []
}

export function submitAdApplication(payload) {
  const list = listAdApplications()
  const id = `adapp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
  const record = {
    id,
    businessName: payload.businessName?.trim() || 'Untitled Business',
    contactName: payload.contactName?.trim() || '',
    email: payload.email?.trim() || '',
    phone: payload.phone?.trim() || '',
    website: safeHttpUrl(payload.website) || '',
    targetAudience: payload.targetAudience || 'gaming',
    monthlyBudget: payload.monthlyBudget || '$500 - $2,500',
    campaignGoals: payload.campaignGoals?.trim() || '',
    status: 'pending',
    submittedAt: new Date().toISOString(),
    reviewedAt: null,
    account: null,
  }
  list.unshift(record)
  lsSet(AD_APPS_KEY, list)
  return record
}

export async function approveAdApplication(appId) {
  const list = listAdApplications()
  const app = list.find((a) => a.id === appId)
  if (!app) return null

  const username = (app.businessName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'partner') + Math.floor(100 + Math.random() * 900)
  const tempPassword = `AdPass-${Math.random().toString(36).slice(2, 8)}!`
  const passwordHash = await hashSecret(tempPassword)

  const advertisers = lsGet(ADVERTISERS_KEY, {}) || {}
  const advertiserId = `adv_${Date.now()}`

  advertisers[advertiserId] = {
    id: advertiserId,
    appId: app.id,
    businessName: app.businessName,
    email: app.email,
    username,
    passwordHash,
    mustChangePassword: true,
    status: 'active',
    createdAt: new Date().toISOString(),
  }
  lsSet(ADVERTISERS_KEY, advertisers)

  const campaigns = lsGet(AD_CAMPAIGNS_KEY, []) || []
  campaigns.unshift({
    id: `camp_${Date.now()}`,
    advertiserId,
    businessName: app.businessName,
    headline: `Discover ${app.businessName}`,
    body: '',
    ctaText: 'Learn More',
    targetUrl: safeHttpUrl(app.website) || '',
    imageUrl: '',
    durationSec: 15,
    skipAfterSec: 5,
    placements: [...ALL_PLACEMENTS],
    status: 'draft',
    budget: app.monthlyBudget,
    impressions: 0,
    clicks: 0,
    skips: 0,
    createdAt: new Date().toISOString(),
  })
  lsSet(AD_CAMPAIGNS_KEY, campaigns)

  app.status = 'approved'
  app.reviewedAt = new Date().toISOString()
  app.account = { username, password: tempPassword, advertiserId }
  lsSet(AD_APPS_KEY, list)
  return app
}

export function rejectAdApplication(appId, reason = '') {
  const list = listAdApplications()
  const app = list.find((a) => a.id === appId)
  if (!app) return null
  app.status = 'rejected'
  app.reviewedAt = new Date().toISOString()
  app.rejectReason = reason
  lsSet(AD_APPS_KEY, list)
  return app
}

export async function advertiserLogin(username, password) {
  const advertisers = lsGet(ADVERTISERS_KEY, {}) || {}
  const u = String(username || '').trim().toLowerCase()
  const p = String(password || '')
  const matches = Object.values(advertisers).filter((a) => String(a.username || '').toLowerCase() === u)
  let found = null
  for (const a of matches) {
    const stored = a.passwordHash || a.password
    if (await verifySecret(p, stored)) {
      found = a
      if (a.password && !isHashedSecret(a.password) && !a.passwordHash) {
        a.passwordHash = await hashSecret(p)
        delete a.password
        advertisers[a.id] = a
        lsSet(ADVERTISERS_KEY, advertisers)
      }
      break
    }
  }
  if (!found) return { ok: false, error: 'Invalid username or password' }
  const session = {
    advertiserId: found.id,
    businessName: found.businessName,
    username: found.username,
    email: found.email,
    mustChangePassword: found.mustChangePassword,
    token: `adv_tok_${Date.now()}`,
  }
  lsSet(AD_SESSION_KEY, session)
  return { ok: true, session }
}

export function getAdvertiserSession() {
  return lsGet(AD_SESSION_KEY, null)
}

export function advertiserLogout() {
  lsSet(AD_SESSION_KEY, null)
}

export async function changeAdvertiserPassword(advertiserId, newPassword) {
  const advertisers = lsGet(ADVERTISERS_KEY, {}) || {}
  const record = advertisers[advertiserId]
  if (!record) return { ok: false, error: 'Advertiser account not found' }
  if (!newPassword || newPassword.length < 8) {
    return { ok: false, error: 'Password must be at least 8 characters' }
  }
  record.passwordHash = await hashSecret(newPassword)
  delete record.password
  record.mustChangePassword = false
  advertisers[advertiserId] = record
  lsSet(ADVERTISERS_KEY, advertisers)
  const cur = getAdvertiserSession()
  if (cur && cur.advertiserId === advertiserId) {
    cur.mustChangePassword = false
    lsSet(AD_SESSION_KEY, cur)
  }
  return { ok: true }
}

export function getAdvertiserCampaigns(advertiserId) {
  const all = lsGet(AD_CAMPAIGNS_KEY, []) || []
  return all.filter((c) => c.advertiserId === advertiserId)
}

export function saveAdvertiserCampaign(campaign) {
  const all = lsGet(AD_CAMPAIGNS_KEY, []) || []
  const safe = {
    ...campaign,
    targetUrl: safeHttpUrl(campaign.targetUrl) || '',
    imageUrl: safeHttpUrl(campaign.imageUrl) || '',
  }
  if (campaign.targetUrl && !safe.targetUrl) {
    throw new Error('Ad link must be a valid https URL.')
  }
  if (campaign.imageUrl && !safe.imageUrl) {
    throw new Error('Ad image must be a valid https URL.')
  }
  const idx = all.findIndex((c) => c.id === campaign.id)
  if (idx >= 0) {
    all[idx] = { ...all[idx], ...safe, updatedAt: new Date().toISOString() }
  } else {
    all.unshift({
      id: `camp_${Date.now()}`,
      impressions: 0,
      clicks: 0,
      skips: 0,
      status: campaign.status || 'draft',
      placements: campaign.placements?.length ? campaign.placements : [...ALL_PLACEMENTS],
      skipAfterSec: Number(campaign.skipAfterSec) || 5,
      createdAt: new Date().toISOString(),
      ...safe,
    })
  }
  lsSet(AD_CAMPAIGNS_KEY, all)
  return all
}

export function adsAreRunning() {
  return lsGet(ADS_RUNNING_KEY, false) === true
}

export function setAdsRunning(on) {
  lsSet(ADS_RUNNING_KEY, !!on)
  return adsAreRunning()
}

export function getAdSettings() {
  const stored = lsGet(AD_SETTINGS_KEY, {}) || {}
  const clipEvery = Math.max(2, Math.min(24, Number(stored.clipFeedEvery) || DEFAULT_AD_SETTINGS.clipFeedEvery))
  const picEvery = Math.max(2, Math.min(24, Number(stored.picFeedEvery) || DEFAULT_AD_SETTINGS.picFeedEvery))
  const skip = Math.max(3, Math.min(30, Number(stored.videoSkipAfterSec) || DEFAULT_AD_SETTINGS.videoSkipAfterSec))
  return {
    ...DEFAULT_AD_SETTINGS,
    ...stored,
    clipFeedEvery: clipEvery,
    picFeedEvery: picEvery,
    videoSkipAfterSec: skip,
  }
}

export function setAdSettings(partial) {
  const next = { ...getAdSettings(), ...(partial || {}) }
  lsSet(AD_SETTINGS_KEY, next)
  return next
}

export function listAllCampaigns() {
  return lsGet(AD_CAMPAIGNS_KEY, []) || []
}

export function campaignInWindow(c, now = Date.now()) {
  if (!c) return false
  if (c.startsAt) {
    const t = new Date(c.startsAt).getTime()
    if (t && t > now) return false
  }
  if (c.endsAt) {
    const t = new Date(c.endsAt).getTime()
    if (t && t < now) return false
  }
  return true
}

export function campaignPlacements(c) {
  if (Array.isArray(c?.placements) && c.placements.length) {
    return c.placements.filter((id) => ALL_PLACEMENTS.includes(id))
  }
  return [...ALL_PLACEMENTS]
}

function settingAllows(placement, settings = getAdSettings()) {
  if (placement === 'video') return settings.videoPreroll !== false
  if (placement === 'clip-banner') return settings.clipBanner !== false
  if (placement === 'clip-feed') return settings.clipInFeed !== false
  if (placement === 'pic-banner') return settings.picBanner !== false
  if (placement === 'pic-feed') return settings.picInFeed !== false
  return false
}

export function listActiveAds(placement) {
  if (!adsAreRunning()) return []
  if (!settingAllows(placement)) return []
  return (lsGet(AD_CAMPAIGNS_KEY, []) || []).filter((c) => {
    if (c.status !== 'active') return false
    if (!campaignInWindow(c)) return false
    if (c.targetUrl && !safeHttpUrl(c.targetUrl)) return false
    return campaignPlacements(c).includes(placement)
  })
}

export function getActiveAd(placement) {
  if (!adsAreRunning()) return null
  const custom = listActiveAds(placement)
  if (custom.length === 0) return null
  return custom[Math.floor(Math.random() * custom.length)]
}

/** Only real active campaigns, and only when admin has turned ads on. */
export function getActiveAdForVideo(_contentId) {
  if (!adsAreRunning()) return null
  return getActiveAd('video')
}

export function getVideoSkipAfterSec(ad) {
  const settings = getAdSettings()
  const n = Number(ad?.skipAfterSec)
  if (Number.isFinite(n) && n > 0) return Math.max(3, Math.min(30, n))
  return settings.videoSkipAfterSec
}

export function getVideoAdDurationSec(ad) {
  const skip = getVideoSkipAfterSec(ad)
  const d = Number(ad?.durationSec)
  if (Number.isFinite(d) && d > 0) return Math.max(skip, Math.min(60, d))
  return Math.max(skip, 15)
}

export function mixFeedAds(items, placement) {
  const list = Array.isArray(items) ? items : []
  const mapped = list.map((item) => ({ kind: 'item', item, key: item?.id }))
  if (!adsAreRunning()) return mapped
  const settings = getAdSettings()
  const every = placement === 'pic-feed' ? settings.picFeedEvery : settings.clipFeedEvery
  if (!settingAllows(placement, settings)) return mapped
  const ads = listActiveAds(placement)
  if (!ads.length) return mapped
  const out = []
  let adIdx = 0
  list.forEach((item, i) => {
    out.push({ kind: 'item', item, key: item?.id || `item-${i}` })
    if ((i + 1) % every === 0 && i < list.length - 1) {
      const ad = ads[adIdx % ads.length]
      out.push({ kind: 'ad', ad, key: `ad-${placement}-${i}-${ad.id}` })
      adIdx += 1
    }
  })
  return out
}

export function recordAdImpression(adId) {
  const metrics = lsGet(AD_METRICS_KEY, {}) || {}
  metrics.totalImpressions = (metrics.totalImpressions || 0) + 1
  const campaigns = lsGet(AD_CAMPAIGNS_KEY, []) || []
  const camp = campaigns.find((c) => c.id === adId)
  if (camp) {
    camp.impressions = (camp.impressions || 0) + 1
    lsSet(AD_CAMPAIGNS_KEY, campaigns)
  }
  lsSet(AD_METRICS_KEY, metrics)
}

export function recordAdClick(adId) {
  const campaigns = lsGet(AD_CAMPAIGNS_KEY, []) || []
  const camp = campaigns.find((c) => c.id === adId)
  if (camp) {
    camp.clicks = (camp.clicks || 0) + 1
    lsSet(AD_CAMPAIGNS_KEY, campaigns)
  }
}

export function recordAdSkip(adId) {
  const campaigns = lsGet(AD_CAMPAIGNS_KEY, []) || []
  const camp = campaigns.find((c) => c.id === adId)
  if (camp) {
    camp.skips = (camp.skips || 0) + 1
    lsSet(AD_CAMPAIGNS_KEY, campaigns)
  }
}
