import { lsGet, lsSet } from './storage'

const AD_SETTINGS_KEY = 'clips_ad_settings'

const DEFAULT_AD_SETTINGS = {
  videoInStream: true,
  clipInFeed: true,
  picInFeed: true,
  videoSkipAfterSec: 5,
}

export function getAdSettings() {
  const stored = lsGet(AD_SETTINGS_KEY, {}) || {}
  const skip = Math.max(3, Math.min(30, Number(stored.videoSkipAfterSec) || DEFAULT_AD_SETTINGS.videoSkipAfterSec))
  return {
    videoInStream: stored.videoInStream !== false && stored.videoPreroll !== false,
    clipInFeed: stored.clipInFeed !== false,
    picInFeed: stored.picInFeed !== false,
    videoSkipAfterSec: skip,
  }
}

export function setAdSettings(partial) {
  const next = { ...getAdSettings(), ...(partial || {}) }
  delete next.clipBanner
  lsSet(AD_SETTINGS_KEY, next)
  return next
}
