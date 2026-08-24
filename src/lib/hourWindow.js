export const FEATURE_MINUTE = 31
export const HOURLY_VIDEO_COUNT = 5
export const HOURLY_CLIP_COUNT = 10
export const HOURLY_PIC_COUNT = 3

/** Clip, video, pic mix so the stage is not a block of one type. 10 / 5 / 3. */
export const HOURLY_PATTERN = [
  'short', 'video', 'short', 'pic', 'short',
  'video', 'short', 'short', 'pic', 'short',
  'video', 'short', 'short', 'video', 'short',
  'pic', 'short', 'video',
]

export function featuredWindowStart(now = Date.now()) {
  const d = new Date(now)
  d.setSeconds(0, 0)
  d.setMilliseconds(0)
  d.setMinutes(FEATURE_MINUTE)
  if (now < d.getTime()) d.setHours(d.getHours() - 1)
  return d.getTime()
}

export function nextFeaturedRefreshAt(now = Date.now()) {
  return featuredWindowStart(now) + 60 * 60 * 1000
}

export function lastHourRange(now = Date.now()) {
  const end = featuredWindowStart(now)
  return { start: end - 60 * 60 * 1000, end }
}

export function interleaveHourlyHits(videos, clips, pics) {
  const q = {
    video: [...(videos || [])],
    short: [...(clips || [])],
    pic: [...(pics || [])],
  }
  const out = []
  const seen = new Set()
  for (const type of HOURLY_PATTERN) {
    const item = q[type].shift()
    if (!item?.id || seen.has(item.id)) continue
    seen.add(item.id)
    out.push(item)
  }
  for (const type of ['short', 'video', 'pic']) {
    while (q[type].length) {
      const item = q[type].shift()
      if (!item?.id || seen.has(item.id)) continue
      seen.add(item.id)
      out.push(item)
    }
  }
  return out
}
