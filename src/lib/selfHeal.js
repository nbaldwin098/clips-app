/**
 * Boot-time repair so a stale or tampered browser cache cannot brick the app.
 */
import { isOwnerAccount } from '../data/ownerLogin'
import { lsGet, lsSet, lsRemove } from './storage'
import { purgeDeadCatalog, isBlobUrl } from './catalogHealth'
import { normalizeTaste } from './algorithmEngine'
import { seedOfficialCatalog } from '../data/publicMediaSeed'
import { seedNamedAccounts } from '../data/namedAccountsSeed'
import { isUserUploadRecord } from './mediaMeta'

function isRecord(v) {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}

function stripPrivileges(user) {
  if (!isRecord(user)) return null
  if (isOwnerAccount(user)) {
    return {
      ...user,
      isPlatformAdmin: true,
      isCreator: true,
      creatorStatus: 'approved',
      role: 'admin',
    }
  }
  if (String(user.id || '').startsWith('org-')) {
    return {
      ...user,
      isPlatformAdmin: false,
      isCreator: true,
      creatorStatus: 'approved',
      role: 'user',
    }
  }
  return {
    ...user,
    isPlatformAdmin: false,
    isCreator: false,
    creatorStatus: 'none',
    role: 'user',
  }
}

/** Wipe legacy local catalog + all ad keys so nothing ghosts from old devices. */
export function wipeLegacyLocalMedia() {
  if (typeof localStorage === 'undefined') return
  const keys = [
    'clips_imports', 'user_clips', 'imports', 'clips_ad_campaigns', 'clips_ad_settings',
    'clips_ads_running', 'clips_ad_stats', 'clips_ad_prefs', 'clips_vast_cache',
    'hidden_broken_media', 'clips_hidden_broken_media',
  ]
  for (const k of keys) {
    try { localStorage.removeItem(k) } catch {}
  }
  try {
    const drop = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (!k) continue
      if (/^(clips_ad|exo|vast|ad_campaign)/i.test(k)) drop.push(k)
    }
    for (const k of drop) localStorage.removeItem(k)
  } catch {}
}

/** Clear dead blob: URLs on in-memory catalog only (no disk write for catalog). */
export function healUploadCatalog() {
  const imports = lsGet('imports', []) || []
  if (!Array.isArray(imports) || !imports.length) return 0
  let changed = 0
  const next = imports.map((row) => {
    if (!row || typeof row !== 'object') return row
    let dirty = false
    const r = { ...row }
    for (const key of ['mediaUrl', 'sourceUrl', 'thumbUrl', 'mosaicThumb']) {
      const u = String(r[key] || '')
      if (isBlobUrl(u)) {
        r[key] = ''
        dirty = true
      }
    }
    const hasHttp = ['mediaUrl', 'sourceUrl'].some((k) => {
      const u = String(r[k] || '')
      return u.startsWith('https://') || u.startsWith('http://')
    })
    if (hasHttp && r.hosted !== true && isUserUploadRecord(r)) {
      r.hosted = true
      r.localStored = false
      dirty = true
    }
    if (dirty) changed += 1
    return r
  })
  if (changed) lsSet('imports', next)
  return changed
}

export function healLocalState() {
  try { wipeLegacyLocalMedia() } catch {}

  try {
    const user = lsGet('user', null)
    if (user) {
      const cleaned = stripPrivileges(user)
      if (cleaned) lsSet('user', cleaned)
      else lsRemove('user')
    }
  } catch {
    try { lsRemove('user') } catch {}
  }

  try {
    const admin = lsGet('clips_admin_session', null)
    if (admin && (!admin.ok || !admin.userId || (admin.exp && Date.now() > admin.exp))) {
      lsSet('clips_admin_session', null)
    }
  } catch {
    try { lsSet('clips_admin_session', null) } catch {}
  }

  // Never restore ad campaigns from disk
  try { localStorage.removeItem('clips_ad_campaigns') } catch {}

  try {
    healUploadCatalog()
    purgeDeadCatalog()
  } catch {}

  try {
    const profiles = lsGet('taste_profiles', {}) || {}
    if (profiles && typeof profiles === 'object' && !Array.isArray(profiles)) {
      const healed = {}
      for (const [userId, taste] of Object.entries(profiles)) {
        healed[userId] = normalizeTaste(taste)
      }
      lsSet('taste_profiles', healed)
    } else {
      lsSet('taste_profiles', {})
    }
  } catch {
    try { lsSet('taste_profiles', {}) } catch {}
  }

  try {
    seedOfficialCatalog()
  } catch {}

  try {
    seedNamedAccounts()
  } catch {}
}

export function installRuntimeGuards() {
  if (typeof window === 'undefined') return
  const onError = (event) => {
    console.warn('[Clips] recovered from runtime error:', event?.message || event)
  }
  const onRejection = (event) => {
    console.warn('[Clips] recovered from unhandled promise:', event?.reason?.message || event?.reason)
    event?.preventDefault?.()
  }
  window.addEventListener('error', onError)
  window.addEventListener('unhandledrejection', onRejection)
  return () => {
    window.removeEventListener('error', onError)
    window.removeEventListener('unhandledrejection', onRejection)
  }
}
