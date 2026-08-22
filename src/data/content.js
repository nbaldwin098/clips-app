/**
 * Content catalog helpers.
 * Catalog is composed of:
 *  - Legal PD/CC seed library (see legalSeed.js)
 *  - User imports via zero-storage importer
 * No fake social creators.
 */

export { LEGAL_SEED, getLegalSeed, getLegalSeedById, LICENSE } from './legalSeed'

export const VIDEOS = []
export const SHORTS = []
export const LIVE_STREAMS = []

export function getCreator() {
  return null
}

export function formatCount(n) {
  if (n == null || isNaN(n)) return '0'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K'
  return String(n)
}

export function formatDuration(seconds) {
  if (!seconds && seconds !== 0) return '0:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}
