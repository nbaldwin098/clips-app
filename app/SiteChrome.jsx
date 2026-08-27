'use client'

import { useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import StreamingNavbar from '../src/components/StreamingNavbar'
import CollapsibleSidebar from '../src/components/CollapsibleSidebar'
import AuthModal from '../src/components/AuthModal'
import { buildHash, parseRoute } from '../src/lib/routes'
import { healLocalState } from '../src/lib/selfHeal'

try { healLocalState() } catch { /* ok */ }

/**
 * Lightweight chrome for SEO-peeled marketing/legal pages.
 * Interactive app routes still use SpaShell (full App).
 */
function ChromeInner({ children }) {
  const router = useRouter()
  const pathname = usePathname() || '/'
  const [authOpen, setAuthOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false) // unused expand — rail is icons-only
  const [searchQuery, setSearchQuery] = useState('')

  const currentView = useMemo(() => {
    const { kind } = parseRoute(pathname)
    return kind || 'home'
  }, [pathname])

  const navigate = (view, id = '', params = null) => {
    router.push(buildHash(view, id || '', params))
  }

  return (
    <div className="min-h-screen bg-[#000000] text-zinc-100 flex flex-col">
      <StreamingNavbar
        onNavigate={navigate}
        onOpenAuth={() => setAuthOpen(true)}
        onOpenWatch={(item) => {
          if (item?.id) navigate('content', item.id)
        }}
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q)
          navigate('explore', '', q?.trim() ? { q: q.trim() } : null)
        }}
      />
      <div className="flex flex-1 min-h-0 relative">
        <CollapsibleSidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          currentView={currentView}
          onNavigate={navigate}
          onSelectLiveStream={() => navigate('live')}
          focusedStreamUserId={null}
        />
        <main className="flex-1 min-h-0 min-w-0 overflow-y-auto bg-[#000000]">
          {children}
        </main>
      </div>
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  )
}

export default function SiteChrome({ children }) {
  return <ChromeInner>{children}</ChromeInner>
}
