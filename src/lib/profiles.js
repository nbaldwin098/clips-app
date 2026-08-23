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
      .select('id, handle, display_name, role, creator_status, avatar_url, bio')
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
