/**
 * Lightweight deploy health — env presence only (no outbound network required).
 * GET /api/health → 200 when Supabase URL+anon present; 503 if critical env missing.
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

  const supabaseConfigured = !!(supabaseUrl && supabaseAnon)
  const stripeConfigured = !!stripePublishable

  const body = {
    ok: supabaseConfigured,
    status: supabaseConfigured ? 'ok' : 'degraded',
    checks: {
      supabaseConfigured,
      stripePublishableConfigured: stripeConfigured,
      // Secret key lives in Edge Functions — not readable here by design.
      stripeSecretOnEdge: 'not_checked',
    },
    service: 'calabi',
    ts: new Date().toISOString(),
  }

  return Response.json(body, {
    status: supabaseConfigured ? 200 : 503,
    headers: {
      'Cache-Control': 'no-store',
    },
  })
}
