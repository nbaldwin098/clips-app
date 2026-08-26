/**
 * Calabi AI avatar maker — procedural SVG avatars (no external AI API yet).
 * Users can set as channel avatar/banner seed or full-body stream overlay flag.
 */

import { lsGet, lsSet } from './storage'

const KEY = 'ai_avatars'

const PALETTES = [
  ['#0ea5e9', '#0369a1', '#e0f2fe'],
  ['#f97316', '#c2410c', '#ffedd5'],
  ['#22c55e', '#15803d', '#dcfce7'],
  ['#a855f7', '#6b21a8', '#f3e8ff'],
  ['#e11d48', '#9f1239', '#ffe4e6'],
  ['#14b8a6', '#0f766e', '#ccfbf1'],
]

function hash(str) {
  let h = 0
  for (let i = 0; i < String(str).length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0
  return h
}

export function generateAiAvatar({ seed, style = 'orb', label = '' } = {}) {
  const s = String(seed || Date.now()).slice(0, 64)
  const h = hash(s)
  const palette = PALETTES[h % PALETTES.length]
  const [a, b, c] = palette
  const cx = 50 + (h % 17) - 8
  const cy = 48 + ((h >> 3) % 15) - 7
  const r = 28 + (h % 10)
  const title = String(label || 'Calabi Avatar').slice(0, 40)
  let body = ''
  if (style === 'body') {
    body = `
      <rect x="35" y="55" width="30" height="40" rx="8" fill="${b}"/>
      <circle cx="${cx}" cy="38" r="18" fill="${a}"/>
      <rect x="22" y="60" width="12" height="28" rx="6" fill="${a}"/>
      <rect x="66" y="60" width="12" height="28" rx="6" fill="${a}"/>
      <rect x="38" y="92" width="10" height="22" rx="4" fill="${b}"/>
      <rect x="52" y="92" width="10" height="22" rx="4" fill="${b}"/>
    `
  } else if (style === 'banner') {
    body = `
      <rect width="100" height="100" fill="${b}"/>
      <circle cx="20" cy="20" r="40" fill="${a}" opacity="0.5"/>
      <circle cx="90" cy="70" r="35" fill="${c}" opacity="0.7"/>
      <text x="50" y="55" text-anchor="middle" fill="#fff" font-size="10" font-family="system-ui">${title.slice(0, 12)}</text>
    `
  } else {
    body = `
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="${a}"/>
      <circle cx="${cx - 8}" cy="${cy - 4}" r="3" fill="#0a0a0a"/>
      <circle cx="${cx + 8}" cy="${cy - 4}" r="3" fill="#0a0a0a"/>
      <path d="M ${cx - 8} ${cy + 10} Q ${cx} ${cy + 16} ${cx + 8} ${cy + 10}" stroke="#0a0a0a" fill="none" stroke-width="2"/>
    `
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${body}</svg>`
  const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
  return {
    id: `ava_${h.toString(36)}_${Date.now().toString(36)}`,
    seed: s,
    style,
    label: title,
    dataUrl,
    createdAt: new Date().toISOString(),
  }
}

export function saveAiAvatar(userId, avatar) {
  if (!userId || !avatar?.id) return { ok: false }
  const all = lsGet(KEY, {}) || {}
  const list = all[userId] || []
  list.unshift(avatar)
  all[userId] = list.slice(0, 24)
  lsSet(KEY, all)
  return { ok: true, list: all[userId] }
}

export function listAiAvatars(userId) {
  if (!userId) return []
  return (lsGet(KEY, {}) || {})[userId] || []
}
