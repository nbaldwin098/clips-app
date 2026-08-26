import { lsGet, lsSet } from './storage'
import { notifyContentChanged } from './contentSync'

const KEY = 'clips_pic_hearts'

export function getPicHearts() {
  const list = lsGet(KEY, [])
  return Array.isArray(list) ? list : []
}

export function isPicHearted(picId) {
  if (!picId) return false
  return getPicHearts().includes(picId)
}

export function togglePicHeart(picId, meta = {}) {
  if (!picId) return getPicHearts()
  const set = new Set(getPicHearts())
  const was = set.has(picId)
  if (was) set.delete(picId)
  else set.add(picId)
  const next = [...set]
  lsSet(KEY, next)
  notifyContentChanged()
  if (!was) {
    queueMicrotask(() => {
      import('./creatorInteractions').then(({ logCreatorInteraction, creatorIdForContent }) => {
        const creatorId = meta.creatorId || creatorIdForContent(picId)
        if (!creatorId) return
        logCreatorInteraction({
          creatorId,
          contentId: picId,
          type: 'like',
          actorId: meta.actorId || null,
          title: meta.title || '',
          surface: 'pics',
          contentType: 'pic',
        })
      }).catch(() => {})
    })
  }
  return next
}
