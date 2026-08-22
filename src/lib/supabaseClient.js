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
export async function getSupabase() {
  const { url, anon, configured } = getSupabaseConfig()
  if (!configured) return null
  if (_client) return _client
  try {
    const { createClient } = await import('@supabase/supabase-js')
    _client = createClient(url, anon)
    return _client
  } catch {
    console.warn('[Clips] Install @supabase/supabase-js and set VITE_SUPABASE_*')
    return null
  }
}
