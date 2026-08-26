/**
 * Env reader for Vite + Next.
 *
 * IMPORTANT: Next/webpack only inlines *static* process.env.NAME access in
 * client bundles. Dynamic process.env[key] is empty in the browser — that
 * broke Supabase after the SEO rebuild and made uploads/catalog look unsaved.
 */
const CLIENT_ENV = {
  VITE_SUPABASE_URL:
    (typeof process !== 'undefined' && (process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)) || '',
  VITE_SUPABASE_ANON_KEY:
    (typeof process !== 'undefined' && (process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)) || '',
  NEXT_PUBLIC_SUPABASE_URL:
    (typeof process !== 'undefined' && (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL)) || '',
  NEXT_PUBLIC_SUPABASE_ANON_KEY:
    (typeof process !== 'undefined' && (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY)) || '',
  VITE_SUPPORT_EMAIL: (typeof process !== 'undefined' && process.env.VITE_SUPPORT_EMAIL) || '',
  VITE_COPYRIGHT_EMAIL: (typeof process !== 'undefined' && process.env.VITE_COPYRIGHT_EMAIL) || '',
  VITE_PRIVACY_EMAIL: (typeof process !== 'undefined' && process.env.VITE_PRIVACY_EMAIL) || '',
  VITE_LEGAL_EMAIL: (typeof process !== 'undefined' && process.env.VITE_LEGAL_EMAIL) || '',
  VITE_DMCA_EMAIL: (typeof process !== 'undefined' && process.env.VITE_DMCA_EMAIL) || '',
  VITE_STRIPE_PUBLISHABLE_KEY:
    (typeof process !== 'undefined' && (process.env.VITE_STRIPE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)) || '',
  VITE_STRIPE_PAYMENT_LINK: (typeof process !== 'undefined' && process.env.VITE_STRIPE_PAYMENT_LINK) || '',
  VITE_PLATFORM_OWNER_ID: (typeof process !== 'undefined' && process.env.VITE_PLATFORM_OWNER_ID) || '',
  VITE_ADMIN_CODE: (typeof process !== 'undefined' && process.env.VITE_ADMIN_CODE) || '',
  VITE_LIVE_INGEST_CONNECTED: (typeof process !== 'undefined' && process.env.VITE_LIVE_INGEST_CONNECTED) || '',
  VITE_LIVE_RTMP_URL: (typeof process !== 'undefined' && (process.env.VITE_LIVE_RTMP_URL || process.env.NEXT_PUBLIC_LIVE_RTMP_URL)) || '',
  NEXT_PUBLIC_LIVE_RTMP_URL: (typeof process !== 'undefined' && (process.env.NEXT_PUBLIC_LIVE_RTMP_URL || process.env.VITE_LIVE_RTMP_URL)) || '',
  VITE_SUPABASE_SQL_EDITOR: (typeof process !== 'undefined' && process.env.VITE_SUPABASE_SQL_EDITOR) || '',
  VITE_APPS_OPEN_FROM: (typeof process !== 'undefined' && process.env.VITE_APPS_OPEN_FROM) || '',
  VITE_APPS_OPEN_UNTIL: (typeof process !== 'undefined' && process.env.VITE_APPS_OPEN_UNTIL) || '',
  VITE_ADSENSE_CLIENT:
    (typeof process !== 'undefined' && (process.env.VITE_ADSENSE_CLIENT || process.env.NEXT_PUBLIC_ADSENSE_CLIENT)) || '',
  NEXT_PUBLIC_ADSENSE_CLIENT:
    (typeof process !== 'undefined' && (process.env.NEXT_PUBLIC_ADSENSE_CLIENT || process.env.VITE_ADSENSE_CLIENT)) || '',
  NODE_ENV: (typeof process !== 'undefined' && process.env.NODE_ENV) || '',
}

function fromImportMeta(key) {
  try {
    const v = import.meta.env?.[key]
    return v != null && String(v).trim() !== '' ? String(v).trim() : ''
  } catch {
    return ''
  }
}

export function runtimeEnv(key, fallback = '') {
  const bare = String(key || '')
  if (!bare) return fallback

  const direct = CLIENT_ENV[bare]
  if (direct != null && String(direct).trim() !== '') return String(direct).trim()

  if (bare.startsWith('VITE_')) {
    const nextKey = `NEXT_PUBLIC_${bare.slice(5)}`
    const viaNext = CLIENT_ENV[nextKey]
    if (viaNext != null && String(viaNext).trim() !== '') return String(viaNext).trim()
  }
  if (bare.startsWith('NEXT_PUBLIC_')) {
    const viteKey = `VITE_${bare.slice('NEXT_PUBLIC_'.length)}`
    const viaVite = CLIENT_ENV[viteKey]
    if (viaVite != null && String(viaVite).trim() !== '') return String(viaVite).trim()
  }

  const meta = fromImportMeta(bare)
  if (meta) return meta
  if (bare.startsWith('NEXT_PUBLIC_')) {
    const metaVite = fromImportMeta(`VITE_${bare.slice('NEXT_PUBLIC_'.length)}`)
    if (metaVite) return metaVite
  }
  if (bare.startsWith('VITE_')) {
    const metaNext = fromImportMeta(`NEXT_PUBLIC_${bare.slice(5)}`)
    if (metaNext) return metaNext
  }

  return fallback
}

export function isProdRuntime() {
  const n = runtimeEnv('NODE_ENV')
  if (n === 'production') return true
  try {
    return !!import.meta.env?.PROD
  } catch {
    return false
  }
}
