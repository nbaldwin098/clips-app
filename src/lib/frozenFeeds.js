/** Rank-once feed caches. Cleared whenever the catalog changes. */

const frozenFeeds = {
  home: new Map(),
  shorts: new Map(),
  following: new Map(),
  followingShorts: new Map(),
}

export function freezeFeed(mapKey, key, build) {
  const map = frozenFeeds[mapKey]
  if (!map) return build()
  const prev = map.get(key)
  if (prev?.length) return prev
  const next = build()
  if (next?.length) map.set(key, next)
  return next
}

export function clearFrozenFeeds() {
  frozenFeeds.home.clear()
  frozenFeeds.shorts.clear()
  frozenFeeds.following.clear()
  frozenFeeds.followingShorts.clear()
}
