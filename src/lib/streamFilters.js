/**
 * Stream / video beauty + FX filters (local presets).
 * Full-body avatar overlay is a flag for the future ingest pipeline.
 */

import { lsGet, lsSet } from './storage'

export const STREAM_FILTERS = [
  { id: 'none', label: 'None', css: '' },
  { id: 'warm', label: 'Warm', css: 'sepia(0.25) saturate(1.2)' },
  { id: 'cool', label: 'Cool', css: 'hue-rotate(20deg) saturate(1.1)' },
  { id: 'vivid', label: 'Vivid', css: 'saturate(1.45) contrast(1.05)' },
  { id: 'noir', label: 'Noir', css: 'grayscale(1) contrast(1.1)' },
  { id: 'soft', label: 'Soft glow', css: 'brightness(1.05) contrast(0.95)' },
  { id: 'retro', label: 'Retro', css: 'sepia(0.4) contrast(1.1) hue-rotate(-10deg)' },
]

const KEY = 'stream_filter_prefs'

export function getStreamFilter(userId) {
  const row = (lsGet(KEY, {}) || {})[userId] || {}
  return {
    filterId: row.filterId || 'none',
    bodyAvatar: !!row.bodyAvatar,
    avatarId: row.avatarId || '',
  }
}

export function setStreamFilter(userId, patch) {
  if (!userId) return { ok: false }
  const all = lsGet(KEY, {}) || {}
  all[userId] = { ...getStreamFilter(userId), ...patch }
  lsSet(KEY, all)
  return { ok: true, prefs: all[userId] }
}

export function filterCss(filterId) {
  return STREAM_FILTERS.find((f) => f.id === filterId)?.css || ''
}
