/**
 * Push/pull live differentiator state (pools, challenges, group streams)
 * through Supabase when configured. Local storage remains source of truth
 * until the live_feature_state table exists.
 */

import { lsGet, lsSet } from './storage'
import { getSupabase, isSupabaseConfigured } from './supabaseClient'

const KEYS = ['live_pools', 'live_challenge_queue', 'live_challenge_active', 'group_streams', 'live_ghost_hour']

export async function pushLiveFeatureState() {
  if (!isSupabaseConfigured()) return { ok: false, reason: 'no_supabase' }
  try {
    const sb = await getSupabase()
    if (!sb) return { ok: false, reason: 'no_client' }
    const payload = {}
    for (const k of KEYS) payload[k] = lsGet(k, null)
    const { error } = await sb.from('live_feature_state').upsert({
      id: 'global',
      state: payload,
      updated_at: new Date().toISOString(),
    })
    if (error) return { ok: false, reason: error.message }
    return { ok: true }
  } catch (e) {
    return { ok: false, reason: e?.message || 'push_failed' }
  }
}

export async function pullLiveFeatureState() {
  if (!isSupabaseConfigured()) return { ok: false, reason: 'no_supabase' }
  try {
    const sb = await getSupabase()
    if (!sb) return { ok: false, reason: 'no_client' }
    const { data, error } = await sb.from('live_feature_state').select('state').eq('id', 'global').maybeSingle()
    if (error) return { ok: false, reason: error.message }
    const state = data?.state
    if (!state || typeof state !== 'object') return { ok: false, reason: 'empty' }
    for (const k of KEYS) {
      if (state[k] != null) lsSet(k, state[k])
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, reason: e?.message || 'pull_failed' }
  }
}
