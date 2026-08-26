export function getSupabaseConfig() {
  try {
    const url = import.meta.env?.VITE_SUPABASE_URL || ''
    const anon = import.meta.env?.VITE_SUPABASE_ANON_KEY || ''
    return { url, anon, configured: !!(url && anon) }
  } catch {
    return { url: '', anon: '', configured: false }
  }
}
export function isSupabaseConfigured() {
  return getSupabaseConfig().configured
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
      console.warn('[Clips] Install @supabase/supabase-js and set VITE_SUPABASE_*')
      _clientPromise = null
      return null
    }
  })()
  return _clientPromise
}
