/**
 * Provision a Cloudflare Stream live input for the signed-in creator.
 * Secrets: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN (Stream Edit).
 * Optional: CLOUDFLARE_STREAM_CUSTOMER (customer-xxxxx subdomain).
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function hlsFrom(uid: string, playback: { hls?: string } | undefined, customer: string) {
  if (playback?.hls) return String(playback.hls)
  if (customer) return `https://${customer}.cloudflarestream.com/${uid}/manifest/video.m3u8`
  return `https://videodelivery.net/${uid}/manifest/video.m3u8`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)

  const accountId = Deno.env.get('CLOUDFLARE_ACCOUNT_ID') || ''
  const token = Deno.env.get('CLOUDFLARE_API_TOKEN') || ''
  const customer = (Deno.env.get('CLOUDFLARE_STREAM_CUSTOMER') || '').replace(/^https?:\/\//, '').replace(/\.cloudflarestream\.com.*$/, '')
  if (!accountId || !token) {
    return json({ ok: false, error: 'cloudflare_not_configured', message: 'Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN on Edge secrets.' }, 501)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  const anon = Deno.env.get('SUPABASE_ANON_KEY') || ''
  const authHeader = req.headers.get('Authorization') || ''
  if (!supabaseUrl || !serviceKey || !authHeader.startsWith('Bearer ')) {
    return json({ ok: false, error: 'unauthorized' }, 401)
  }

  const userClient = createClient(supabaseUrl, anon || serviceKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: userData, error: userErr } = await userClient.auth.getUser()
  const userId = userData?.user?.id
  if (userErr || !userId) return json({ ok: false, error: 'unauthorized' }, 401)

  const admin = createClient(supabaseUrl, serviceKey)
  const existing = await admin.from('cloudflare_live_inputs').select('*').eq('user_id', userId).maybeSingle()
  if (existing.data?.live_input_id && existing.data?.stream_key && existing.data?.hls_url) {
    return json({
      ok: true,
      provider: 'cloudflare-stream',
      liveInputId: existing.data.live_input_id,
      rtmpsUrl: existing.data.rtmps_url,
      streamKey: existing.data.stream_key,
      hlsUrl: existing.data.hls_url,
      reused: true,
    })
  }

  const cfRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/live_inputs`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      meta: { name: `calabi:${userId.slice(0, 8)}` },
      deleteRecordingAfterDays: 3,
      recording: { mode: 'automatic', requireSignedURLs: false },
    }),
  })
  const cfJson = await cfRes.json().catch(() => ({}))
  if (!cfRes.ok || !cfJson?.success || !cfJson?.result?.uid) {
    return json({
      ok: false,
      error: 'cloudflare_api',
      message: cfJson?.errors?.[0]?.message || `Cloudflare HTTP ${cfRes.status}`,
    }, 502)
  }

  const row = cfJson.result
  const uid = String(row.uid)
  const rtmpsUrl = String(row.rtmps?.url || 'rtmps://live.cloudflare.com:443/live/')
  const streamKey = String(row.rtmps?.streamKey || '')
  const hlsUrl = hlsFrom(uid, row.playback, customer)
  if (!streamKey) return json({ ok: false, error: 'cloudflare_api', message: 'No stream key returned' }, 502)

  const saved = await admin.from('cloudflare_live_inputs').upsert({
    user_id: userId,
    live_input_id: uid,
    rtmps_url: rtmpsUrl,
    stream_key: streamKey,
    hls_url: hlsUrl,
    updated_at: new Date().toISOString(),
  })
  if (saved.error) {
    console.error('cloudflare_live_inputs upsert', saved.error.message)
  }

  return json({
    ok: true,
    provider: 'cloudflare-stream',
    liveInputId: uid,
    rtmpsUrl,
    streamKey,
    hlsUrl,
    reused: false,
  })
})
