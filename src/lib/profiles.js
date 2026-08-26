/**
 * Server-backed profile/roles. Privileges (admin, creator) live here — never
 * in localStorage or user_metadata the client can write.
 */
import { getSupabase, isSupabaseConfigured } from './supabaseClient'

export async function fetchOwnProfile() {
  if (!isSupabaseConfigured()) return null
  try {
    const sb = await getSupabase()
    if (!sb) return null
    const { data: sessionData } = await sb.auth.getSession()
    const uid = sessionData?.session?.user?.id
    if (!uid) return null
    const { data, error } = await sb
      .from('profiles')
      .select('id, handle, display_name, role, creator_status, avatar_url, bio, show_ads')
      .eq('id', uid)
      .maybeSingle()
    if (error || !data) return null
    return data
  } catch {
    return null
  }
}

export async function ensureOwnProfile(user) {
  if (!user?.id || user.provider !== 'supabase' || !isSupabaseConfigured()) return null
  const existing = await fetchOwnProfile()
  if (existing) return existing
  try {
    const sb = await getSupabase()
    if (!sb) return null
    const { error } = await sb.from('profiles').upsert({
      id: user.id,
      handle: user.handle || null,
      display_name: user.displayName || null,
      avatar_url: user.avatarUrl || null,
      bio: user.bio || '',
    }, { onConflict: 'id' })
    if (error) return null
    return fetchOwnProfile()
  } catch {
    return null
  }
}

export async function setCreatorStatus(targetUserId, status) {
  if (!targetUserId || !isSupabaseConfigured()) return false
  try {
    const sb = await getSupabase()
    if (!sb) return false
    const { error } = await sb
      .from('profiles')
      .update({ creator_status: status, updated_at: new Date().toISOString() })
      .eq('id', targetUserId)
    return !error
  } catch {
    return false
  }
}

export async function updateOwnProfileFields(partial = {}) {
  if (!isSupabaseConfigured()) return false
  try {
    const sb = await getSupabase()
    if (!sb) return false
    const { data: sessionData } = await sb.auth.getSession()
    const uid = sessionData?.session?.user?.id
    if (!uid) return false
    const row = { updated_at: new Date().toISOString() }
    if (partial.showAds != null) row.show_ads = partial.showAds !== false
    if (partial.displayName != null) row.display_name = partial.displayName
    if (partial.handle != null) row.handle = partial.handle
    if (partial.bio != null) row.bio = partial.bio
    if (partial.avatarUrl != null) row.avatar_url = partial.avatarUrl
    const { error } = await sb.from('profiles').update(row).eq('id', uid)
    return !error
  } catch {
    return false
  }
}

export function privilegesFromProfile(profile, fallbackOwner = false) {
  const role = profile?.role || 'user'
  const creatorStatus = profile?.creator_status || 'none'
  const isAdmin = role === 'admin' || fallbackOwner
  return {
    role,
    creatorStatus: isAdmin && creatorStatus === 'none' ? 'approved' : creatorStatus,
    isCreator: creatorStatus === 'approved' || isAdmin,
    isPlatformAdmin: isAdmin,
  }
}

/** Batch-resolve public profile identity for bubble-map actor nodes. */
export async function fetchProfilesByIds(ids = []) {
  const unique = [...new Set((ids || []).filter(Boolean).map(String))]
  if (!unique.length || !isSupabaseConfigured()) return {}
  try {
    const sb = await getSupabase()
    if (!sb) return {}
    const { data, error } = await sb
      .from('profiles')
      .select('id, handle, display_name, avatar_url')
      .in('id', unique.slice(0, 200))
    if (error || !data) return {}
    const out = {}
    for (const row of data) {
      if (!row?.id) continue
      out[row.id] = {
        id: row.id,
        handle: row.handle || null,
        displayName: row.display_name || row.handle || null,
        avatarUrl: row.avatar_url || null,
      }
    }
    return out
  } catch {
    return {}
  }
}
