/**
 * Lightweight deploy health — env presence only (no outbound network, no secret values).
 * GET /api/health → 200 when Supabase URL+anon present; 503 if those are missing.
 */
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
  const stripePublishable = present(
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    'VITE_STRIPE_PUBLISHABLE_KEY',
  )
  const vapidPublic = present('NEXT_PUBLIC_VAPID_PUBLIC_KEY', 'VITE_VAPID_PUBLIC_KEY')
  const pushSubscribe = present('VITE_PUSH_SUBSCRIBE_URL', 'NEXT_PUBLIC_PUSH_SUBSCRIBE_URL')
  const ownerId = present('VITE_PLATFORM_OWNER_ID', 'NEXT_PUBLIC_PLATFORM_OWNER_ID')
  const liveIngestFlag = present('VITE_LIVE_INGEST_CONNECTED', 'NEXT_PUBLIC_LIVE_INGEST_CONNECTED')

  const supabaseConfigured = !!(supabaseUrl && supabaseAnon)
  const stripeConfigured = !!stripePublishable

  const body = {
    ok: supabaseConfigured,
    status: supabaseConfigured ? 'ok' : 'degraded',
    checks: {
      supabaseConfigured,
      stripePublishableConfigured: stripeConfigured,
      vapidPublicConfigured: !!vapidPublic,
      pushSubscribeConfigured: !!pushSubscribe,
      platformOwnerConfigured: !!ownerId,
      liveIngestFlagOn: /^(1|true|yes|on)$/i.test(liveIngestFlag),
      stripeSecretOnEdge: 'not_checked',
      stripeWebhookSecretOnEdge: 'not_checked',
      vapidPrivateOnEdge: 'not_checked',
    },
    service: 'calabi',
    publicUrl: 'https://calabi.us',
    ts: new Date().toISOString(),
  }

  return Response.json(body, {
    status: supabaseConfigured ? 200 : 503,
    headers: {
      'Cache-Control': 'no-store',
    },
  })
}
