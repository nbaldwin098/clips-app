/** Live ads removed — stubs keep Stream settings / chat imports compiling. */
export function liveAdsSnoozed() { return false }
export function manualAdCooldownRemaining() { return 0 }
export function liveAdTimeUsedInHour() { return 0 }
export function cueLiveAd() { return { ok: false, error: 'Ads removed.' } }
export function manualAdCooldownSec() { return 0 }
export function snoozeLiveAds() {}
export function parseAdSlash() { return null }
export function applyAdSlash() { return { ok: false, error: 'Ads removed.' } }
export function getLiveAdState() {
  return { pending: null, snoozeUntil: 0, adsPerHour: 0, usedSec: 0 }
}
export function scheduleLiveAd() { return { ok: false, error: 'Ads removed.' } }
export function setLiveAdsPerHour() { return 0 }
export function liveAdIntervalFromPerHour() { return 0 }
export function cancelLiveAdSchedule() {}
export const LIVE_SNOOZE_SEC = 0
export const LIVE_HOURLY_AD_CAP_SEC = 0
export const LIVE_VIEWER_AD_DELAY_SEC = 0
export const LIVE_ADS_PER_HOUR_MIN = 0
export const LIVE_ADS_PER_HOUR_MAX = 0
export const MANUAL_AD_BREAKS = []
