import { runtimeEnv } from './runtimeEnv'

let _missingLogged = false

export function getSupabaseConfig() {
  try {
    const url = runtimeEnv('VITE_SUPABASE_URL') || runtimeEnv('NEXT_PUBLIC_SUPABASE_URL')
    const anon = runtimeEnv('VITE_SUPABASE_ANON_KEY') || runtimeEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    const configured = !!(url && anon)
    if (!configured && !_missingLogged) {
      _missingLogged = true
      console.warn(
        '[calabi] Supabase env missing — cloud sync/auth/uploads need NEXT_PUBLIC_SUPABASE_* (docs/RENDER_ENV.md)',
      )
    }
    return { url, anon, configured }
  } catch {
    return { url: '', anon: '', configured: false }
  }
}
export function isSupabaseConfigured() {
  return getSupabaseConfig().configured
}

/** Explicit fail-loud entry for boot (console.error once via getSupabaseConfig). */
export function warnIfSupabaseMissing() {
  return !isSupabaseConfigured()
}
let _client = null
let _clientPromise = null
export async function getSupabase() {
  const { url, anon, configured } = getSupabaseConfig()
  if (!configured) return null
  if (_client) return _client
  if (_clientPromise) return _clientPromise
  _clientPromise = (async () => {
    try {
      const { createClient } = await import('@supabase/supabase-js')
      _client = createClient(url, anon, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storageKey: 'sb-calabi-auth-token',
        },
      })
      return _client
    } catch {
      console.error('[calabi] Failed to init @supabase/supabase-js — install the package and set NEXT_PUBLIC_SUPABASE_*')
      _clientPromise = null
      return null
    }
  })()
  return _clientPromise
}
