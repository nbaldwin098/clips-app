// Record a unique content view (one per viewer_key / IP, not per rewatch).
// Secrets: uses SUPABASE_* automatically. Deploy:
//   supabase functions deploy record-content-view
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

async function sha16(text: string) {
  const data = new TextEncoder().encode(text)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 16)
}

function clientIp(req: Request) {
  const cf = req.headers.get('cf-connecting-ip')
  if (cf) return cf.trim()
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  const real = req.headers.get('x-real-ip')
  if (real) return real.trim()
  return ''
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
  const anon = Deno.env.get('SUPABASE_ANON_KEY') || ''
  const authHeader = req.headers.get('Authorization') || ''
  if (!supabaseUrl || !anon) return json({ error: 'Server misconfigured' }, 500)

  let body: Record<string, unknown> = {}
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  const contentId = String(body.contentId || '').trim()
  const creatorId = String(body.creatorId || '').trim()
  if (!contentId || !creatorId) return json({ error: 'contentId and creatorId required' }, 400)

  const ip = clientIp(req)
  const ipHash = ip ? await sha16(ip) : ''

  let actorId: string | null = null
  let sb = createClient(supabaseUrl, anon)
  if (authHeader) {
    sb = createClient(supabaseUrl, anon, { global: { headers: { Authorization: authHeader } } })
    const { data } = await sb.auth.getUser()
    actorId = data?.user?.id || null
  }

  // Prefer signed-in user id; otherwise unique by IP (anonymous viewers).
  const viewerKey = actorId || (ipHash ? `ip:${ipHash}` : null)
  if (!viewerKey) return json({ error: 'No viewer identity (sign in or IP required)' }, 400)

  const rowId = `cvu_${contentId}_${viewerKey}`.replace(/[^a-zA-Z0-9:_-]/g, '_').slice(0, 180)
  const row = {
    id: rowId,
    content_id: contentId,
    creator_id: creatorId,
    actor_id: actorId,
    viewer_key: viewerKey,
    viewer_ip: ipHash ? `h:${ipHash}` : null,
    surface: String(body.surface || 'unknown').slice(0, 40),
    content_type: body.contentType ? String(body.contentType).slice(0, 40) : null,
    created_at: new Date().toISOString(),
  }

  // Service role preferred for guest IP inserts (anon RLS requires auth).
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  const writer = service
    ? createClient(supabaseUrl, service)
    : sb

  const { error } = await writer.from('content_views').upsert(row, { onConflict: 'id' })
  if (error) return json({ error: error.message }, 502)

  // Also mirror a view interaction for bubble map when signed in
  if (actorId) {
    const interactionId = `ci_view_${contentId}_${actorId}`.replace(/[^a-zA-Z0-9:_-]/g, '_').slice(0, 180)
    await writer.from('creator_interactions').upsert({
      id: interactionId,
      creator_id: creatorId,
      content_id: contentId,
      type: 'view',
      actor_id: actorId,
      title: String(body.title || '').slice(0, 120),
      weight: 1,
      surface: row.surface,
      content_type: row.content_type,
      source: 'live',
      at: row.created_at,
    }, { onConflict: 'id' })
  }

  const { count } = await writer
    .from('content_views')
    .select('id', { count: 'exact', head: true })
    .eq('content_id', contentId)
    .not('viewer_key', 'is', null)

  return json({ ok: true, unique: true, viewerKey, views: count || 0 })
})
