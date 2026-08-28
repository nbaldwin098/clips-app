function present(...keys) {
  for (const k of keys) {
    const v = (typeof process !== 'undefined' && process.env?.[k]) || ''
    if (String(v).trim()) return String(v).trim()
  }
  return ''
}

export async function GET() {
  const supabaseUrl = present('NEXT_PUBLIC_SUPABASE_URL', 'VITE_SUPABASE_URL')
  const supabaseAnon = present('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY')
  const stripePublishable = present('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', 'VITE_STRIPE_PUBLISHABLE_KEY')
  const vapidPublic = present('NEXT_PUBLIC_VAPID_PUBLIC_KEY', 'VITE_VAPID_PUBLIC_KEY')
  const pushSubscribe = present('VITE_PUSH_SUBSCRIBE_URL', 'NEXT_PUBLIC_PUSH_SUBSCRIBE_URL')
  const ownerId = present('VITE_PLATFORM_OWNER_ID', 'NEXT_PUBLIC_PLATFORM_OWNER_ID')
  const liveIngestFlag = present('VITE_LIVE_INGEST_CONNECTED', 'NEXT_PUBLIC_LIVE_INGEST_CONNECTED')
  const liveRtmp = present('VITE_LIVE_RTMP_URL', 'NEXT_PUBLIC_LIVE_RTMP_URL')
  const liveHls = present('VITE_LIVE_HLS_BASE', 'NEXT_PUBLIC_LIVE_HLS_BASE')
  const liveWhip = present('VITE_LIVE_WHIP_URL', 'NEXT_PUBLIC_LIVE_WHIP_URL')

  const supabaseConfigured = !!(supabaseUrl && supabaseAnon)

  const body = {
    ok: supabaseConfigured,
    status: supabaseConfigured ? 'ok' : 'degraded',
    checks: {
      supabaseConfigured,
      stripePublishableConfigured: !!stripePublishable,
      vapidPublicConfigured: !!vapidPublic,
      pushSubscribeConfigured: !!pushSubscribe,
      platformOwnerConfigured: !!ownerId,
      liveIngestFlagOn: /^(1|true|yes|on)$/i.test(liveIngestFlag),
      liveRtmpConfigured: !!liveRtmp,
      liveHlsConfigured: !!liveHls,
      liveWhipConfigured: !!liveWhip,
    },
    service: 'calabi',
    publicUrl: 'https://calabi.us',
    ts: new Date().toISOString(),
  }

  return Response.json(body, {
    status: supabaseConfigured ? 200 : 503,
    headers: { 'Cache-Control': 'no-store' },
  })
}
