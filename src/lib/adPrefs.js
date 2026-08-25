/**
 * Viewer ad preference — stored on profiles.show_ads in Supabase, not localStorage.
 */
import { getSupabase, isSupabaseConfigured } from './supabaseClient'
import { adsHeld } from './trustSafety'

let viewerId = null
let showAds = true

export function setAdViewer(user) {
  viewerId = user?.provider === 'supabase' && user?.id ? user.id : null
  showAds = user?.showAds !== false
}

export function getAdViewerId() {
  return viewerId
}

export function viewerWantsAds(userId = viewerId) {
  if (!userId) return true
  if (adsHeld(userId)) return false
  if (userId === viewerId) return showAds !== false
  return true
}

export async function fetchViewerShowAds(userId) {
  if (!userId || !isSupabaseConfigured()) return true
  try {
    const sb = await getSupabase()
    if (!sb) return true
    const { data, error } = await sb
      .from('profiles')
      .select('show_ads')
      .eq('id', userId)
      .maybeSingle()
    if (error || !data) return true
    return data.show_ads !== false
  } catch {
    return true
  }
}

export async function saveViewerShowAds(userId, nextShow) {
  if (!userId) return showAds
  const value = nextShow !== false
  showAds = value
  if (!isSupabaseConfigured()) return value
  try {
    const sb = await getSupabase()
    if (!sb) return value
    await sb.from('profiles').update({
      show_ads: value,
      updated_at: new Date().toISOString(),
    }).eq('id', userId)
  } catch { /* keep local choice */ }
  return value
}
