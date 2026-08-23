import { useState, useRef, useCallback, useEffect } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getPicsFeed, publishPhoto, pickImmediatePhotoSrc, isHttpUrl, isDataImageUrl } from '../lib/picsService'
import { isSupabaseConfigured } from '../lib/supabaseClient'
import { subscribeContentUpdates } from '../lib/contentSync'
import { getMediaBlobUrl } from '../lib/videoStorage'

function PicImage({ pic, className, alt = '', full = false }) {
  const immediate = pickImmediatePhotoSrc(pic, { full })
  const [recovered, setRecovered] = useState(null)
  const [failed, setFailed] = useState(false)
  const src = recovered || immediate

  useEffect(() => {
    let alive = true
    let objectUrl = null

    const recover = async () => {
      if (isHttpUrl(immediate)) return
      if (!full && isDataImageUrl(immediate)) return
      const idbUrl = await getMediaBlobUrl(pic.id)
      if (!alive || !idbUrl) return
      objectUrl = idbUrl
      setRecovered(idbUrl)
    }
    recover()

    return () => {
      alive = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [pic.id, immediate, full])

  const onError = async () => {
    const idbUrl = await getMediaBlobUrl(pic.id)
    if (idbUrl && idbUrl !== src) {
      setRecovered(idbUrl)
      return
    }
    const fallback = [pic.thumbUrl, pic.mediaUrl, pic.sourceUrl].find(
      (u) => u && u !== src && (isHttpUrl(u) || isDataImageUrl(u))
    )
    if (fallback) {
      setRecovered(fallback)
      return
    }
    setFailed(true)
  }

  if (failed || !src) {
    return <div className={`bg-zinc-900 ${className || ''}`} />
  }

  return <img src={src} alt={alt} className={className} onError={onError} />
}

/** Grid of all pics · click one → full-screen vertical scroll through the set */
export default function PicsPage({ onOpenAuth }) {
  const { user, isAuthenticated } = useAuth()
  const inputRef = useRef(null)
  const viewerRef = useRef(null)
  const [items, setItems] = useState(() => getPicsFeed())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [viewerIndex, setViewerIndex] = useState(null) // null = closed

  const refresh = useCallback(() => setItems(getPicsFeed()), [])

  useEffect(() => subscribeContentUpdates(refresh), [refresh])

  const onPick = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!isAuthenticated) {
      onOpenAuth?.()
      return
    }
    setBusy(true)
    setError('')
    try {
      const res = await publishPhoto(file, user)
      if (!res.ok) {
        setError(res.error || 'Upload failed.')
        return
      }
      refresh()
    } catch (err) {
      setError(err?.message || 'Upload failed.')
    } finally {
      setBusy(false)
    }
  }

  const openUpload = () => {
    if (!isAuthenticated) {
      onOpenAuth?.()
      return
    }
    inputRef.current?.click()
  }

  const openAt = (index) => setViewerIndex(index)

  // Jump scroller to the tapped image when opening
  useEffect(() => {
    if (viewerIndex == null || !viewerRef.current) return
    const el = viewerRef.current
    const h = el.clientHeight || 1
    el.scrollTop = viewerIndex * h
  }, [viewerIndex])

  useEffect(() => {
    if (viewerIndex == null) return
    const onKey = (e) => {
      if (e.key === 'Escape') setViewerIndex(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [viewerIndex])

  return (
    <div className="min-h-full bg-[#09090c]">
      <div className="sticky top-0 z-10 border-b border-zinc-800/80 bg-[#09090c]/95 backdrop-blur px-4 py-3 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Pics</h1>
        </div>
        <button type="button" onClick={openUpload} disabled={busy} className="h-9 px-3 rounded-lg bg-white text-black text-sm font-semibold disabled:opacity-60 inline-flex items-center gap-1.5">
          <ImagePlus className="h-4 w-4" />
          {busy ? 'Uploading…' : 'Upload'}
        </button>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
      </div>

      {error && <p className="px-4 pt-3 text-sm text-red-400">{error}</p>}
      {!isSupabaseConfigured() && (
        <p className="px-4 pt-2 text-[11px] text-zinc-600">Storage offline — pics stay on this device until the clips bucket is public.</p>
      )}

      {items.length === 0 ? (
        <div className="m-4 rounded-2xl border border-zinc-800 bg-[#121218] px-6 py-16 text-center">
          <p className="text-sm text-zinc-300">No pics yet</p>
          <button type="button" onClick={openUpload} className="mt-4 h-9 px-4 rounded-lg bg-white text-black text-sm font-semibold">Upload first pic</button>
        </div>
      ) : (
        /* tight mosaic — no titles, names, or captions */
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-0.5 p-0.5 pb-20">
          {items.map((pic, index) => (
            <button
              key={pic.id}
              type="button"
              onClick={() => openAt(index)}
              className="relative aspect-square overflow-hidden bg-zinc-900 group focus:outline-none"
            >
              <PicImage key={pic.id} pic={pic} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
              <div className="pointer-events-none absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
            </button>
          ))}
        </div>
      )}

      {/* Full-screen vertical scroll through all pics */}
      {viewerIndex != null && (
        <div className="fixed inset-0 z-[120] bg-black">
          <button
            type="button"
            className="absolute top-4 right-4 z-30 h-10 w-10 rounded-full bg-white/10 text-white flex items-center justify-center"
            onClick={() => setViewerIndex(null)}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          <p className="absolute top-5 left-1/2 -translate-x-1/2 z-30 text-[11px] text-white/50 pointer-events-none">
            {viewerIndex + 1}/{items.length}
          </p>
          <div
            ref={viewerRef}
            className="h-full w-full overflow-y-scroll snap-y snap-mandatory"
            style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
            onScroll={(e) => {
              const el = e.currentTarget
              const h = el.clientHeight || 1
              const idx = Math.round(el.scrollTop / h)
              if (idx !== viewerIndex && idx >= 0 && idx < items.length) setViewerIndex(idx)
            }}
          >
            {items.map((pic) => (
              <div key={pic.id} className="h-full w-full snap-start snap-always flex items-center justify-center shrink-0">
                <PicImage pic={pic} full className="max-h-full max-w-full object-contain" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
