import { getSupabase, getSupabaseConfig } from './supabaseClient'

export async function provisionCloudflareLive() {
  const { url, anon, configured } = getSupabaseConfig()
  if (!configured || !url) {
    return { ok: false, error: 'no_supabase' }
  }
  const sb = await getSupabase()
  if (!sb) return { ok: false, error: 'no_supabase' }
  const { data: sess } = await sb.auth.getSession()
  const token = sess?.session?.access_token
  if (!token) return { ok: false, error: 'sign_in' }

  let res
  try {
    res = await fetch(`${url.replace(/\/$/, '')}/functions/v1/live-ingest`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: anon,
        'Content-Type': 'application/json',
      },
      body: '{}',
    })
  } catch {
    return { ok: false, error: 'network' }
  }

  const body = await res.json().catch(() => ({}))
  if (res.status === 404) return { ok: false, error: 'not_deployed', message: 'Deploy live-ingest Edge Function.' }
  if (!res.ok || !body?.ok) {
    return {
      ok: false,
      error: body?.error || `http_${res.status}`,
      message: body?.message || '',
    }
  }
  return {
    ok: true,
    provider: 'cloudflare-stream',
    liveInputId: body.liveInputId,
    rtmpsUrl: body.rtmpsUrl,
    streamKey: body.streamKey,
    hlsUrl: body.hlsUrl,
    reused: !!body.reused,
  }
}
