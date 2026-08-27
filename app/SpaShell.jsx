'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import App from '../src/App.jsx'
import { healLocalState } from '../src/lib/selfHeal'
import { restoreLostUploads } from '../src/lib/restoreUploads'
import { syncContentFromCloud } from '../src/lib/contentSync'
import { NextNavContext } from '../src/lib/NextNavContext'

function isStaleAssetError(reason) {
  const msg = String(reason?.message || reason || '')
  return (
    /Loading chunk [\d]+ failed/i.test(msg)
    || /Failed to fetch dynamically imported module/i.test(msg)
    || /Importing a module script failed/i.test(msg)
    || /ChunkLoadError/i.test(msg)
  )
}

/**
 * Temporary bridge: mount the existing Vite SPA shell inside Next.js
 * while routes are peeled out into real App Router pages for SEO.
 */
export default function SpaShell() {
  const router = useRouter()
  const pathname = usePathname() || '/'

  useEffect(() => {
    try { healLocalState() } catch {}
    restoreLostUploads().catch(() => {})
    // Pull catalog ASAP so home/clips aren't stuck on an empty first paint.
    syncContentFromCloud().catch(() => {})
  }, [])

  useEffect(() => {
    const reloadOnce = () => {
      try {
        const key = 'calabi_chunk_reload'
        if (sessionStorage.getItem(key)) return
        sessionStorage.setItem(key, '1')
        window.location.reload()
      } catch {
        window.location.reload()
      }
    }
    const onRejection = (e) => {
      if (isStaleAssetError(e?.reason)) reloadOnce()
    }
    const onError = (e) => {
      if (isStaleAssetError(e?.error || e?.message)) reloadOnce()
    }
    window.addEventListener('unhandledrejection', onRejection)
    window.addEventListener('error', onError)
    return () => {
      window.removeEventListener('unhandledrejection', onRejection)
      window.removeEventListener('error', onError)
    }
  }, [])

  return (
    <NextNavContext.Provider value={{ router, pathname }}>
      <div className="h-full w-full min-h-0">
        <App />
      </div>
    </NextNavContext.Provider>
  )
}
