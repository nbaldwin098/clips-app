'use client'

import { useEffect, useState } from 'react'
import { isSupabaseConfigured } from '../lib/supabaseClient'

const DISMISS_KEY = 'calabi_env_banner_dismissed'

/**
 * Missing-cloud banner — dismissible, session-only.
 * Console still logs loudly via warnIfSupabaseMissing.
 */
export default function EnvConfigBanner() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === '1') return
      setShow(!isSupabaseConfigured())
    } catch {
      setShow(true)
    }
  }, [])

  if (!show) return null

  return (
    <div
      role="status"
      className="border-b border-zinc-800 bg-[#121218] px-3 py-2 text-center text-[11px] text-zinc-400 flex items-center justify-center gap-3"
    >
      <span>
        Cloud env missing — uploads/sign-in stay on this device until Supabase keys are set.
      </span>
      <button
        type="button"
        className="shrink-0 text-zinc-200 underline hover:text-white"
        onClick={() => {
          try { sessionStorage.setItem(DISMISS_KEY, '1') } catch { /* ignore */ }
          setShow(false)
        }}
      >
        Dismiss
      </button>
    </div>
  )
}
