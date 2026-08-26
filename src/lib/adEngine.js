/** Ads system removed from calabi. */
export const AD_PLACEMENTS = []
export const ALL_PLACEMENTS = []
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
export function listAdApplications() { return [] }
export function submitAdApplication() { return { ok: false } }
export function approveAdApplication() { return null }
export function rejectAdApplication() { return null }
export function getAdSettings() { return {} }
export function setAdSettings() { return {} }
export function campaignPlacements() { return [] }
export function advertiserLogin() { return { ok: false, error: 'Ads removed.' } }
export function getAdvertiserSession() { return null }
export function advertiserLogout() {}
export function changeAdvertiserPassword() { return { ok: false } }
export function getAdvertiserCampaigns() { return [] }
export function saveAdvertiserCampaign() { return { ok: false } }
