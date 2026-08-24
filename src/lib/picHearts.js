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

export function togglePicHeart(picId) {
  if (!picId) return getPicHearts()
  const set = new Set(getPicHearts())
  if (set.has(picId)) set.delete(picId)
  else set.add(picId)
  const next = [...set]
  lsSet(KEY, next)
  notifyContentChanged()
  return next
}
