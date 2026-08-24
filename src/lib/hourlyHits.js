import { lsGet } from './storage'
import { getHomeFeed } from './contentService'
import { getPicsFeed } from './picsService'
import { isFeedable, isReferenceItem } from './catalogHealth'
import { hourViewCount } from './hourViewEvents'
import {
  featuredWindowStart,
  lastHourRange,
  nextFeaturedRefreshAt,
  interleaveHourlyHits,
  HOURLY_VIDEO_COUNT,
  HOURLY_CLIP_COUNT,
  HOURLY_PIC_COUNT,
} from './hourWindow'

export {
  featuredWindowStart,
  lastHourRange,
  nextFeaturedRefreshAt,
  interleaveHourlyHits,
  HOURLY_VIDEO_COUNT,
  HOURLY_CLIP_COUNT,
  HOURLY_PIC_COUNT,
} from './hourWindow'

function lifetimeViews(contentId) {
  return Number((lsGet('engagement_views', {}) || {})[contentId] || 0)
}

function scoreItem(item, start, end) {
  const hour = hourViewCount(item.id, start, end)
  const all = lifetimeViews(item.id) || item.views || 0
  const created = new Date(item.createdAt || item.publishedAt || 0).getTime()
  const recency = created ? Math.max(0, 1_000_000_000 - Math.floor((end - created) / 60000)) : 0
  return hour * 1_000_000 + all * 10 + recency
}

function rankType(items, limit, start, end) {
  return [...items]
    .sort((a, b) => {
      const d = scoreItem(b, start, end) - scoreItem(a, start, end)
      if (d) return d
      return String(a.id).localeCompare(String(b.id))
    })
    .slice(0, limit)
}

export function getHourlyHits(now = Date.now()) {
  const windowStart = featuredWindowStart(now)
  const { start, end } = lastHourRange(now)
  const catalog = getHomeFeed(null) || []
  const videos = catalog.filter((i) => i?.type === 'video' && isFeedable(i) && !isReferenceItem(i))
  const clips = catalog.filter((i) => i?.type === 'short' && isFeedable(i) && !isReferenceItem(i))
  const pics = (getPicsFeed() || []).filter((i) => i && !isReferenceItem(i))
  const topVideos = rankType(videos, HOURLY_VIDEO_COUNT, start, end)
  const topClips = rankType(clips, HOURLY_CLIP_COUNT, start, end)
  const topPics = rankType(pics, HOURLY_PIC_COUNT, start, end)
  const items = interleaveHourlyHits(topVideos, topClips, topPics).map((item) => ({
    ...item,
    hourViews: hourViewCount(item.id, start, end),
  }))
  return {
    items,
    windowStart,
    nextAt: nextFeaturedRefreshAt(now),
    lookbackStart: start,
    lookbackEnd: end,
    counts: {
      video: items.filter((i) => i.type === 'video').length,
      short: items.filter((i) => i.type === 'short').length,
      pic: items.filter((i) => i.type === 'pic').length,
    },
  }
}
