'use client'

import { useEffect } from 'react'
import App from '../src/App.jsx'
import { healLocalState } from '../src/lib/selfHeal'
import { restoreLostUploads } from '../src/lib/restoreUploads'

/**
 * Temporary bridge: mount the existing Vite SPA shell inside Next.js
 * while routes are peeled out into real App Router pages for SEO.
 */
export default function SpaShell() {
  useEffect(() => {
    try { healLocalState() } catch {}
    restoreLostUploads().catch(() => {})
  }, [])

  return <App />
}
