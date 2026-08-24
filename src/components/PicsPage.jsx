import { useState, useRef, useCallback, useEffect } from 'react'
import { ImagePlus, X, Share2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getPicsFeed, publishPhoto, pickImmediatePhotoSrc, isHttpUrl, isDataImageUrl } from '../lib/picsService'
import { subscribeContentUpdates, deleteContentRecord } from '../lib/contentSync'
import { hideBrokenMedia } from '../lib/catalogHealth'
import { getMediaBlobUrl } from '../lib/videoStorage'
import { copyShareUrl, replaceHash } from '../lib/routes'
import ShortsStage, { ShortsCard } from './ShortsStage'

function PicImage({ pic, className, alt = '', full = false, fill = false, onUnplayable }) {
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
      if (!alive) return
      if (idbUrl) {
        objectUrl = idbUrl
        setRecovered(idbUrl)
        return
      }
      if (!immediate) onUnplayable?.(pic.id)
    }
    recover()

    return () => {
      alive = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [pic.id, immediate, full, onUnplayable])

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
    onUnplayable?.(pic.id)
  }

  if (failed || !src) return null

  if (fill) {
    return (
      <img
        src={src}
        alt={alt}
        className="absolute inset-0 h-full w-full object-cover"
        onError={onError}
        decoding="async"
      />
    )
  }

  return <img src={src} alt={alt} className={className} onError={onError} decoding="async" />
}

function PicSlide({ pic, onOpenProfile }) {
  const share = async (e) => {
    e?.stopPropagation?.()
    try { await copyShareUrl('pic', pic.id) } catch {}
  }
  const handle = pic.handle ? `@${String(pic.handle).replace(/^@/, '')}` : ''
  const actions = (
    <button type="button" onClick={share} className="flex flex-col items-center gap-1">
      <span className="h-11 w-11 rounded-full bg-[#272727] hover:bg-[#3d3d3d] flex items-center justify-center text-white">
        <Share2 className="h-5 w-5" />
      </span>
    </button>
  )

  return (
    <ShortsCard actions={actions}>
      <div className="absolute inset-0 bg-black flex items-center justify-center">
        <PicImage pic={pic} full className="max-h-full max-w-full w-auto h-auto object-contain" />
      </div>
      {handle ? (
        <div className="absolute inset-x-0 bottom-0 pt-16 pb-5 px-3 bg-gradient-to-t from-black/70 to-transparent z-10">
          <button
            type="button"
            onClick={() => onOpenProfile?.(pic.handle, pic.creatorId)}
            className="text-sm font-semibold text-white"
          >
            {handle}
          </button>
        </div>
      ) : null}
      <div className="md:hidden absolute right-2 bottom-24 z-10">{actions}</div>
    </ShortsCard>
  )
}

/** Mosaic of every real pic · tap opens a Shorts-style roll · X returns to the mosaic */
export default function PicsPage({ onOpenAuth, onOpenProfile, initialPicId }) {
  const { user, isAuthenticated } = useAuth()
  const inputRef = useRef(null)
  const [items, setItems] = useState(() => getPicsFeed())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [viewerIndex, setViewerIndex] = useState(() => {
    if (!initialPicId) return null
    const list = getPicsFeed()
    const idx = list.findIndex((p) => p.id === initialPicId)
    return idx >= 0 ? idx : null
  })
  const [openedAt, setOpenedAt] = useState(() => {
    if (!initialPicId) return 0
    const list = getPicsFeed()
    const idx = list.findIndex((p) => p.id === initialPicId)
    return idx >= 0 ? idx : 0
  })

  const skipAutoOpen = useRef(false)
  const refresh = useCallback(() => setItems(getPicsFeed()), [])
  const dropBroken = useCallback((id) => {
    hideBrokenMedia(id)
    deleteContentRecord(id, user)
    refresh()
  }, [user, refresh])
  useEffect(() => subscribeContentUpdates(refresh), [refresh])

  useEffect(() => {
    if (!initialPicId || skipAutoOpen.current) return
    const idx = items.findIndex((p) => p.id === initialPicId)
    if (idx >= 0) {
      setOpenedAt(idx)
      setViewerIndex(idx)
    }
  }, [initialPicId, items])

  const closeViewer = () => {
    skipAutoOpen.current = true
    setViewerIndex(null)
    replaceHash('pics')
  }

  const openAt = (index) => {
    setOpenedAt(index)
    setViewerIndex(index)
    const pic = items[index]
    if (pic && typeof window !== 'undefined') {
      window.history.replaceState(null, '', `${window.location.pathname}#/pic/${encodeURIComponent(pic.id)}`)
    }
  }

  useEffect(() => {
    if (viewerIndex == null) return
    const onKey = (e) => { if (e.key === 'Escape') closeViewer() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [viewerIndex])

  const onPick = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!isAuthenticated) { onOpenAuth?.(); return }
    setBusy(true)
    setError('')
    try {
      const res = await publishPhoto(file, user)
      if (!res.ok) { setError(res.error || 'Upload failed.'); return }
      refresh()
    } catch (err) {
      setError(err?.message || 'Upload failed.')
    } finally {
      setBusy(false)
    }
  }

  const openUpload = () => {
    if (!isAuthenticated) { onOpenAuth?.(); return }
    inputRef.current?.click()
  }

  if (viewerIndex != null && items.length > 0) {
    return (
      <div className="h-full min-h-0 flex flex-col bg-[#000000]">
        <ShortsStage
          key={`pic-reel-${openedAt}`}
          count={items.length}
          activeIndex={viewerIndex}
          onActiveIndex={(i) => {
            setViewerIndex(i)
            const pic = items[i]
            if (pic && typeof window !== 'undefined') {
              window.history.replaceState(null, '', `${window.location.pathname}#/pic/${encodeURIComponent(pic.id)}`)
            }
          }}
          initialIndex={openedAt}
          header={(
            <div className="shrink-0 flex items-center justify-between px-3 py-2">
              <button type="button" onClick={closeViewer} className="h-9 px-3 rounded-full bg-white/10 text-white text-xs inline-flex items-center gap-1.5">
                <X className="h-4 w-4" /> Back to pics
              </button>
              <p className="text-[11px] text-white/50">{viewerIndex + 1}/{items.length}</p>
            </div>
          )}
          renderSlide={(index) => (
            items[index] ? <PicSlide pic={items[index]} onOpenProfile={onOpenProfile} /> : null
          )}
        />
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto bg-[#000000]">
      <div className="sticky top-0 z-10 border-b border-zinc-800/80 bg-[#000000]/95 backdrop-blur px-4 py-3 flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-zinc-100">Pics</h1>
        <button type="button" onClick={openUpload} disabled={busy} className="h-9 px-3 rounded-lg bg-white text-black text-sm font-semibold disabled:opacity-60 inline-flex items-center gap-1.5">
          <ImagePlus className="h-4 w-4" />
          {busy ? 'Uploading…' : 'Upload'}
        </button>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
      </div>

      {error && <p className="px-4 pt-3 text-sm text-red-400">{error}</p>}
      {items.length === 0 ? (
        <div className="m-4 rounded-2xl border border-zinc-800 bg-[#121218] px-6 py-16 text-center">
          <p className="text-sm text-zinc-300">No pics yet</p>
          <button type="button" onClick={openUpload} className="mt-4 h-9 px-4 rounded-lg bg-white text-black text-sm font-semibold">Upload first pic</button>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-0.5 p-0.5 pb-20">
          {items.map((pic, index) => (
            <button
              key={pic.id}
              type="button"
              onClick={() => openAt(index)}
              className="relative block w-full aspect-square overflow-hidden bg-zinc-800 group focus:outline-none"
            >
              <PicImage key={pic.id} pic={pic} fill onUnplayable={dropBroken} />
              <div className="pointer-events-none absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
