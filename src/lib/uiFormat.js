import { formatCount, formatDuration } from '../data/content'

export { formatCount, formatDuration }

export function viewsLabel(n) {
  const v = Number(n) || 0
  if (v <= 0) return 'No views'
  if (v === 1) return '1 view'
  return `${formatCount(v)} views`
}

export function likesLabel(n) {
  return formatCount(Number(n) || 0)
}

export function subscribersLabel(n) {
  const v = Number(n) || 0
  if (v <= 0) return ''
  if (v === 1) return '1 subscriber'
  return `${formatCount(v)} subscribers`
}

export function creatorDisplayName(item) {
  const name = item?.displayName || item?.creatorName || ''
  if (name) return name
  const handle = String(item?.handle || '').replace(/^@/, '')
  return handle || 'Creator'
}

export function isOfficialCreator(id, handle) {
  if (String(id || '').startsWith('org-')) return true
  const h = String(handle || '').toLowerCase().replace(/^@/, '')
  return ['nasa', 'noaa', 'esa', 'usfws', 'nasaconnect', 'classroom', 'nara'].includes(h)
}

export function watchingLabel(n) {
  const v = Number(n) || 0
  if (v <= 0) return 'Waiting'
  if (v === 1) return '1 watching'
  return `${formatCount(v)} watching`
}
