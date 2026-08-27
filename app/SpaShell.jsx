'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import App from '../src/App.jsx'
import { healLocalState } from '../src/lib/selfHeal'
import { restoreLostUploads } from '../src/lib/restoreUploads'
import { syncContentFromCloud } from '../src/lib/contentSync'
import { NextNavContext } from '../src/lib/NextNavContext'

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

  return (
    <NextNavContext.Provider value={{ router, pathname }}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[100] focus:bg-white focus:text-black focus:px-3 focus:py-2 focus:text-sm focus:font-semibold"
      >
        Skip to content
      </a>
      <div id="main-content">
        <App />
      </div>
    </NextNavContext.Provider>
  )
}
