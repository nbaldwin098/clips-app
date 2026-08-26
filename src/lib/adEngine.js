/** Ads system removed from calabi. */
export function adsAreRunning() { return false }
export function mixFeedAds(items) {
  return (items || []).map((item) => ({ kind: 'item', item, key: item?.id }))
}
export function mixClipFeedRows(items) {
  return (items || []).map((item) => ({ kind: 'item', item, key: item?.id }))
}
export function mixPicFeedRows(items) {
  return (items || []).map((item) => ({ kind: 'item', item, key: item?.id }))
}
export function placementAdsAllowed() { return false }
export function clipBannerAllowed() { return false }
export function getActiveAd() { return null }
export function getActiveAdForVideo() { return null }
export function recordAdImpression() {}
export function recordAdSkip() {}
export function recordAdClick() {}
export function getVideoAdDurationSec() { return 0 }
export function getVideoSkipAfterSec() { return 0 }
