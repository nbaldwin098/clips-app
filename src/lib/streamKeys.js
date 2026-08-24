import { lsGet, lsSet } from './storage'

export function ensureStreamKey(userId) {
  if (!userId) return ''
  const keyName = `stream_key_${userId}`
  let key = lsGet(keyName, null)
  if (!key) {
    key = `live_${userId.replace(/[^a-z0-9]/gi, '').slice(0, 12)}_${Math.random().toString(36).slice(2, 10)}`
    lsSet(keyName, key)
  }
  return key
}

export function rotateStreamKey(userId) {
  if (!userId) return ''
  const key = `live_${userId.replace(/[^a-z0-9]/gi, '').slice(0, 12)}_${Math.random().toString(36).slice(2, 10)}`
  lsSet(`stream_key_${userId}`, key)
  return key
}
