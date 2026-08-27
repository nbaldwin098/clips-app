'use client'

import { useEffect, useState } from 'react'
import { isSupabaseConfigured } from '../lib/supabaseClient'

/** Loud UI when cloud env is missing (pairs with console.error in supabaseClient). */
export default function EnvConfigBanner() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    try {
      setShow(!isSupabaseConfigured())
    } catch {
      setShow(true)
    }
  }, [])

  if (!show) return null

  return (
    <div
      role="alert"
      className="border-b border-amber-500/40 bg-amber-950/90 px-3 py-2 text-center text-xs text-amber-100"
    >
      Cloud is not configured (missing NEXT_PUBLIC_SUPABASE_URL / ANON_KEY). Sign-in sync and uploads stay on this device only.
      {' '}
      See docs/RENDER_ENV.md.
    </div>
  )
}
