/** Feed ads removed. */
export function mixClipFeedRows(items) {
  return (items || []).map((item) => ({ kind: 'item', item, key: item?.id }))
}
export function mixPicFeedRows(items) {
  return (items || []).map((item) => ({ kind: 'item', item, key: item?.id }))
}
export function clipBannerAllowedOnMixed() { return false }
