/** Cloud live board with HLS fields. Falls back if extra columns are missing. */
import { lsGet, lsSet } from './storage'
import { getSupabase, isSupabaseConfigured } from './supabaseClient'
import { isFreshLive } from './liveStatus'

function toRow(payload) {
  return {
    user_id: payload.userId,
    is_live: true,
    title: payload.title || 'Live',
    handle: payload.handle || null,
    display_name: payload.displayName || null,
    category: payload.category || null,
    started_at: payload.startedAt || new Date().toISOString(),
    watcher_ids: payload.watcherIds || [],
    hls_url: payload.hlsUrl || '',
    ingest_connected: !!payload.ingestConnected,
    provider: payload.provider || '',
    rtmps_url: payload.rtmpsUrl || '',
  }
}

function fromRow(r, prev = {}) {
  const startedAt = r.started_at || prev.startedAt
  const fresh = isFreshLive({ startedAt })
  const hlsUrl = r.hls_url || prev.hlsUrl || ''
  return {
    userId: r.user_id,
    isLive: fresh && r.is_live !== false,
    title: r.title || prev.title || 'Live',
    handle: r.handle || prev.handle,
    displayName: r.display_name || prev.displayName,
    category: r.category || prev.category,
    startedAt,
    watcherIds: Array.isArray(r.watcher_ids) ? r.watcher_ids : (prev.watcherIds || []),
    watchers: Array.isArray(r.watcher_ids) ? r.watcher_ids.length : (prev.watchers || 0),
    hlsUrl,
    ingestConnected: !!(fresh && r.ingest_connected),
    provider: r.provider || prev.provider || '',
    rtmpsUrl: r.rtmps_url || prev.rtmpsUrl || '',
    streamKey: prev.streamKey || '',
  }
}

export async function pushLiveBoardRow(payload) {
  if (!payload?.userId || !isSupabaseConfigured()) return false
  try {
    const sb = await getSupabase()
    if (!sb) return false
    const full = toRow(payload)
    let { error } = await sb.from('live_lobby').upsert(full)
    if (error) {
      const { error: err2 } = await sb.from('live_lobby').upsert({
        user_id: full.user_id,
        is_live: true,
        title: full.title,
        handle: full.handle,
        display_name: full.display_name,
        category: full.category,
        started_at: full.started_at,
        watcher_ids: full.watcher_ids,
      })
      error = err2
    }
    return !error
  } catch {
    return false
  }
}

export async function pullLiveBoard() {
  if (!isSupabaseConfigured()) return false
  try {
    const sb = await getSupabase()
    if (!sb) return false
    const { data, error } = await sb.from('live_lobby').select('*').eq('is_live', true).limit(200)
    if (error || !Array.isArray(data)) return false
    const local = lsGet('live_board', []) || []
    const localBy = Object.fromEntries(local.filter((b) => b?.userId).map((b) => [b.userId, b]))
    const board = data.map((r) => fromRow(r, localBy[r.user_id] || {})).filter((b) => isFreshLive(b))
    for (const row of local) {
      if (row?.isLive && isFreshLive(row) && row.userId && !board.some((b) => b.userId === row.userId)) {
        board.unshift(row)
      }
    }
    lsSet('live_board', board)
    return true
  } catch {
    return false
  }
}
