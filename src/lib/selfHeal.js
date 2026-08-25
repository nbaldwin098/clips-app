/**
 * Boot-time repair so a stale or tampered browser cache cannot brick the app
 * after months without a deploy.
 */
import { isOwnerAccount } from '../data/ownerLogin'
import { lsGet, lsSet, lsRemove } from './storage'
import { safeHttpUrl } from './safeUrl'
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

function healCampaigns(list) {
  if (!Array.isArray(list)) return []
  return list.map((c) => {
    if (!isRecord(c)) return null
    const targetUrl = safeHttpUrl(c.targetUrl)
    return { ...c, targetUrl: targetUrl || '' }
  }).filter(Boolean)
}

/** Clear dead blob: URLs. Only mark localStored for legacy rows still without an http link. */
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
    } else if (!hasHttp && isUserUploadRecord(r) && Number(r.storedBytes) > 0 && r.localStored !== true) {
      // Legacy device-only row awaiting promoteDeviceUploadsToCloud.
      r.localStored = true
      dirty = true
    }
    if (dirty) changed += 1
    return r
  })
  if (changed) lsSet('imports', next)
  return changed
}

export function healLocalState() {
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

  try {
    const campaigns = lsGet('clips_ad_campaigns', [])
    lsSet('clips_ad_campaigns', healCampaigns(campaigns))
  } catch {}

  try {
    const imports = lsGet('imports', [])
    if (!Array.isArray(imports)) lsSet('imports', [])
    else {
      healUploadCatalog()
      purgeDeadCatalog()
    }
  } catch {
    try { lsSet('imports', []) } catch {}
  }

  try {
    const imports = lsGet('imports', []) || []
    const users = lsGet('users_index', {}) || {}
    for (const item of imports) {
      const id = item?.creatorId || item?.userId
      if (!id || String(id).startsWith('ref-')) continue
      const handle = String(item.handle || item.creatorHandle || '').replace(/^@/, '').toLowerCase()
      const prev = users[id] && typeof users[id] === 'object' ? users[id] : {}
      users[id] = {
        ...prev,
        id,
        handle: handle || prev.handle || '',
        displayName: prev.displayName || item.displayName || item.creatorName || handle || prev.handle,
        avatarUrl: prev.avatarUrl || item.avatarUrl || null,
        bannerUrl: prev.bannerUrl || null,
        bio: prev.bio || '',
        updatedAt: prev.updatedAt || new Date().toISOString(),
      }
    }
    lsSet('users_index', users)
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
    lsRemove('clips_ads_running')
  } catch {}

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
