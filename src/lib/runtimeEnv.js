/**
 * Env reader that works in Vite (import.meta.env) and Next.js (process.env).
 * Prefer NEXT_PUBLIC_* on Next; keep VITE_* for existing Render vars.
 */
export function runtimeEnv(key, fallback = '') {
  const bare = String(key || '')
  const nextKey = bare.startsWith('VITE_')
    ? `NEXT_PUBLIC_${bare.slice(5)}`
    : bare.startsWith('NEXT_PUBLIC_')
      ? bare
      : `NEXT_PUBLIC_${bare}`
  const viteKey = bare.startsWith('VITE_') ? bare : `VITE_${bare.replace(/^NEXT_PUBLIC_/, '')}`

  try {
    if (typeof process !== 'undefined' && process.env) {
      const a = process.env[bare]
      if (a != null && String(a).trim() !== '') return String(a).trim()
      const b = process.env[nextKey]
      if (b != null && String(b).trim() !== '') return String(b).trim()
      const c = process.env[viteKey]
      if (c != null && String(c).trim() !== '') return String(c).trim()
    }
  } catch { /* ignore */ }

  try {
    const meta = import.meta.env
    const a = meta?.[bare]
    if (a != null && String(a).trim() !== '') return String(a).trim()
    const b = meta?.[viteKey]
    if (b != null && String(b).trim() !== '') return String(b).trim()
  } catch { /* ignore */ }

  return fallback
}

export function isProdRuntime() {
  try {
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production') return true
  } catch { /* ignore */ }
  try {
    return !!import.meta.env?.PROD
  } catch {
    return false
  }
}
