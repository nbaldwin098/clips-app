import { lsGet } from './storage'
import { getHomeFeed } from './contentService'
import { getPicsFeed } from './picsService'
import { isFeedable, isReferenceItem } from './catalogHealth'
import {
  featuredWindowStart,
  nextFeaturedRefreshAt,
  interleaveHourlyHits,
  HOURLY_VIDEO_COUNT,
  HOURLY_CLIP_COUNT,
  HOURLY_PIC_COUNT,
} from './hourWindow'

export {
  featuredWindowStart,
  nextFeaturedRefreshAt,
  interleaveHourlyHits,
  HOURLY_VIDEO_COUNT,
  HOURLY_CLIP_COUNT,
  HOURLY_PIC_COUNT,
} from './hourWindow'

function lifetimeViews(item) {
  const id = item?.id
  const engagement = Number((lsGet('engagement_views', {}) || {})[id] || 0)
  const catalog = Number((lsGet('clips_content_views', {}) || {})[id] || 0)
  const stored = Number(item?.views || 0)
  return Math.max(engagement, catalog, stored)
}

function scoreItem(item) {
  return lifetimeViews(item)
}

function rankType(items, limit) {
  return [...items]
    .sort((a, b) => {
      const d = scoreItem(b) - scoreItem(a)
      if (d) return d
      return String(a.id).localeCompare(String(b.id))
    })
    .slice(0, limit)
}

export function getHourlyHits(now = Date.now()) {
  const windowStart = featuredWindowStart(now)
  const catalog = getHomeFeed(null) || []
  const videos = catalog.filter((i) => i?.type === 'video' && isFeedable(i) && !isReferenceItem(i))
  const clips = catalog.filter((i) => i?.type === 'short' && isFeedable(i) && !isReferenceItem(i))
  const pics = (getPicsFeed() || []).filter((i) => i && !isReferenceItem(i))
  const topVideos = rankType(videos, HOURLY_VIDEO_COUNT)
  const topClips = rankType(clips, HOURLY_CLIP_COUNT)
  const topPics = rankType(pics, HOURLY_PIC_COUNT)
  const items = interleaveHourlyHits(topVideos, topClips, topPics).map((item) => ({
    ...item,
    views: lifetimeViews(item),
  }))
  return {
    items,
    windowStart,
    nextAt: nextFeaturedRefreshAt(now),
    counts: {
      video: items.filter((i) => i.type === 'video').length,
      short: items.filter((i) => i.type === 'short').length,
      pic: items.filter((i) => i.type === 'pic').length,
    },
  }
}
