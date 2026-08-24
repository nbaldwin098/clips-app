import csv from './namedAccounts.csv?raw'
import { lsGet, lsSet } from '../lib/storage'
import { normalizeHandle } from '../lib/moderation'

export const BLACK_PROFILE_URL = '/media/black.png'
const USERS_INDEX = 'users_index'
const NAMED_MAX = 467

function parseCsv(text) {
  const lines = String(text || '').trim().split(/\r?\n/)
  const rows = []
  for (const line of lines.slice(1)) {
    const parts = line.split(',')
    if (parts.length < 4) continue
    const n = Number(parts[0])
    if (!Number.isInteger(n) || n < 1 || n > NAMED_MAX) continue
    const firstName = String(parts[1] || '').trim()
    const lastName = String(parts[2] || '').trim()
    const displayName = String(parts[3] || '').trim() || `${firstName} ${lastName}`.trim()
    const handle = normalizeHandle(`${firstName}${lastName}${n}`) || `named${n}`
    rows.push({
      n,
      id: `named-${String(n).padStart(4, '0')}`,
      firstName,
      lastName,
      displayName,
      handle,
      email: `name${n}@calabi.com`,
      avatarUrl: BLACK_PROFILE_URL,
      bannerUrl: BLACK_PROFILE_URL,
    })
  }
  return rows
}

export const NAMED_ACCOUNTS = parseCsv(csv)

export function namedAccountPasswordFor(n) {
  const id = Number(n)
  if (!Number.isInteger(id) || id < 1 || id > NAMED_MAX) return ''
  return `Hoka${String(id).padStart(4, '0')}`
}

export function verifyNamedAccountPassword(n, password) {
  const expected = namedAccountPasswordFor(n)
  return !!expected && String(password || '') === expected
}

export function findNamedAccountLogin(email) {
  const m = /^name(\d{1,3})@calabi\.com$/i.exec(String(email || '').trim())
  if (!m) return null
  const n = Number(m[1])
  return NAMED_ACCOUNTS.find((row) => row.n === n) || null
}

export function seedNamedAccounts() {
  const users = lsGet(USERS_INDEX, {})
  if (!users || typeof users !== 'object') return
  for (const row of NAMED_ACCOUNTS) {
    users[row.id] = {
      id: row.id,
      email: row.email,
      handle: row.handle,
      displayName: row.displayName,
      creatorStatus: 'none',
      isCreator: false,
      avatarUrl: BLACK_PROFILE_URL,
      bannerUrl: BLACK_PROFILE_URL,
      bio: '',
      updatedAt: '2026-08-24T12:00:00.000Z',
    }
  }
  lsSet(USERS_INDEX, users)
}
