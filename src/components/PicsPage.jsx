import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { ImagePlus, X, Share2, Download, Heart } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getPicsFeed, publishPhoto, pickImmediatePhotoSrc, isHttpUrl, isDataImageUrl } from '../lib/picsService'
import { isFeedable } from '../lib/catalogHealth'
import { isPicHearted, togglePicHeart } from '../lib/picHearts'
import { useContentSyncTick } from '../lib/useContentSync'
import { subscribeContentUpdates } from '../lib/contentSync'
import { hideBrokenMedia } from '../lib/catalogHealth'
import { deleteCatalogItem } from '../lib/contentService'
import { getMediaBlobUrl } from '../lib/videoStorage'
import { copyShareUrl, replaceHash } from '../lib/routes'
import ShortsStage, { ShortsCard } from './ShortsStage'
import { downloadPostedMedia } from '../lib/mediaDownload'
import { shuffleFeed } from '../lib/shuffleFeed'
import { preloadPostedItems } from '../lib/preloadMedia'

function PicImage({ pic, className, alt = '', full = false, fill = false, eager = false, onUnplayable }) {
  const immediate = pickImmediatePhotoSrc(pic, { full })
  const [recovered, setRecovered] = useState(null)
  const [failed, setFailed] = useState(false)
  const src = recovered || immediate

  useEffect(() => {
    let alive = true
    let objectUrl = null

    const recover = async () => {
      if (isHttpUrl(immediate) || isDataImageUrl(immediate)) return
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
        loading={eager ? 'eager' : 'lazy'}
        fetchPriority={eager ? 'high' : 'low'}
      />
    )
  }

  return <img src={src} alt={alt} className={className} onError={onError} decoding="async" loading={eager ? 'eager' : 'lazy'} fetchPriority={eager ? 'high' : 'low'} />
}

function PicHeartBtn({ pic, active, onOpenAuth, className = '' }) {
  const { user } = useAuth()
  const syncTick = useContentSyncTick()
  const [burst, setBurst] = useState(false)
  const hearted = useMemo(() => isPicHearted(pic.id), [pic.id, syncTick])

  if (!active) return null

  const toggle = (e) => {
    e?.stopPropagation?.()
    e?.preventDefault?.()
    if (!user?.id) { onOpenAuth?.(); return }
    togglePicHeart(pic.id)
    setBurst(true)
    setTimeout(() => setBurst(false), 450)
  }

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        className={`flex flex-col items-center gap-1 transition-opacity duration-200 ${className}`}
        aria-label={hearted ? 'Unheart' : 'Heart'}
      >
        <span className={`h-11 w-11 rounded-full flex items-center justify-center text-white transition-colors ${hearted ? 'bg-red-500/90' : 'bg-[#272727] hover:bg-[#3d3d3d] group-hover:bg-[#3d3d3d]'}`}>
          <Heart className={`h-5 w-5 ${hearted ? 'fill-current' : ''}`} />
        </span>
      </button>
      {burst && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <Heart className="h-20 w-20 text-red-400 fill-red-400 drop-shadow-lg" />
        </div>
      )}
    </>
  )
}

function PicSlide({ pic, active, onOpenProfile, onOpenAuth, eager = true }) {
  const { user } = useAuth()
  const lastTap = useRef(0)

  const share = async (e) => {
    e?.stopPropagation?.()
    try { await copyShareUrl('pic', pic.id) } catch {}
  }

  const onSurfaceClick = () => {
    const now = Date.now()
    if (now - lastTap.current < 280) {
      if (!user?.id) { onOpenAuth?.(); return }
      togglePicHeart(pic.id)
    }
    lastTap.current = now
  }

  const handle = pic.handle ? `@${String(pic.handle).replace(/^@/, '')}` : ''
  const actions = (
    <>
      <PicHeartBtn pic={pic} active={active} onOpenAuth={onOpenAuth} />
      <button type="button" onClick={share} className="flex flex-col items-center gap-1">
        <span className="h-11 w-11 rounded-full bg-[#272727] hover:bg-[#3d3d3d] flex items-center justify-center text-white">
          <Share2 className="h-5 w-5" />
        </span>
      </button>
      <button type="button" onClick={() => downloadPostedMedia(pic)} className="flex flex-col items-center gap-1">
        <span className="h-11 w-11 rounded-full bg-[#272727] hover:bg-[#3d3d3d] flex items-center justify-center text-white">
          <Download className="h-5 w-5" />
        </span>
      </button>
    </>
  )

  return (
    <ShortsCard actions={actions}>
      <div
        className="absolute inset-0 bg-black flex items-center justify-center group"
        onClick={onSurfaceClick}
      >
        <PicImage pic={pic} full eager={eager} className="max-h-full max-w-full w-auto h-auto object-contain" />
        {active ? (
          <div className="md:hidden absolute right-3 top-1/2 -translate-y-1/2 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none group-hover:pointer-events-auto">
            <PicHeartBtn pic={pic} active onOpenAuth={onOpenAuth} />
          </div>
        ) : null}
      </div>
          {handle ? (
        <div className="absolute inset-x-0 bottom-0 z-10">
          <div className="pt-16 pb-2 px-3 bg-gradient-to-t from-black/70 to-transparent">
            <button
              type="button"
              onClick={() => onOpenProfile?.(pic.handle, pic.creatorId)}
              className="text-sm font-semibold text-white"
            >
              {handle}
            </button>
          </div>
        </div>
      ) : null}
      <div className="md:hidden absolute right-2 bottom-32 z-10">{actions}</div>
    </ShortsCard>
  )
}

function MosaicPicTile({ pic, onOpen, onOpenAuth, onUnplayable }) {
  const { user } = useAuth()
  const syncTick = useContentSyncTick()
  const hearted = useMemo(() => isPicHearted(pic.id), [pic.id, syncTick])

  const heart = (e) => {
    e.stopPropagation()
    e.preventDefault()
    if (!user?.id) { onOpenAuth?.(); return }
    togglePicHeart(pic.id)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen()}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen() } }}
      className="relative block w-full aspect-square overflow-hidden bg-zinc-800 group focus:outline-none cursor-pointer"
    >
      <PicImage key={pic.id} pic={pic} fill onUnplayable={onUnplayable} />
      <div className="pointer-events-none absolute inset-0 bg-black/0 group-hover:bg-black/35 transition-colors" />
      <button
        type="button"
        onClick={heart}
        className={`absolute top-2 right-2 z-10 h-9 w-9 rounded-full flex items-center justify-center transition-all duration-200 ${
          hearted
            ? 'opacity-100 bg-red-500/90 text-white'
            : 'opacity-0 group-hover:opacity-100 bg-black/55 text-white hover:bg-black/70'
        }`}
        aria-label={hearted ? 'Unheart' : 'Heart'}
      >
        <Heart className={`h-4 w-4 ${hearted ? 'fill-current' : ''}`} />
      </button>
      {pic.title ? (
        <span className="pointer-events-none absolute bottom-1.5 left-1.5 right-1.5 text-[11px] text-white line-clamp-2 opacity-0 group-hover:opacity-100 drop-shadow">
          {pic.title}
        </span>
      ) : null}
    </div>
  )
}

/** Mosaic of every real pic · tap opens a Shorts-style roll · X returns to the mosaic */
export default function PicsPage({ onOpenAuth, onOpenProfile, initialPicId }) {
  const { user, isAuthenticated } = useAuth()
  const inputRef = useRef(null)
  const [items, setItems] = useState(() => getPicsFeed())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [viewerIndex, setViewerIndex] = useState(() => (initialPicId ? 0 : null))
  const [openedAt, setOpenedAt] = useState(0)

  const shuffled = useMemo(() => {
    const list = (items || []).filter(isFeedable)
    if (!initialPicId) return shuffleFeed(list)
    // Deep-link / profile tap: keep that pic first so the viewer does not
    // open a random neighbor from the unshuffled index.
    const focused = list.find((p) => p.id === initialPicId)
    const rest = shuffleFeed(list.filter((p) => p.id !== initialPicId))
    return focused && isFeedable(focused) ? [focused, ...rest] : shuffleFeed(list)
  }, [items, initialPicId])
  // Pic reel is content-only — no full-screen ad slides that stop scroll.
  const scrollRows = useMemo(
    () => shuffled.map((item, i) => ({ kind: 'item', item, key: item?.id || `item-${i}` })),
    [shuffled],
  )
  const goToRef = useRef(null)
  const skipAutoOpen = useRef(false)
  const refresh = useCallback(() => setItems(getPicsFeed()), [])
  const dropBroken = useCallback((id) => {
    hideBrokenMedia(id)
    deleteCatalogItem(id, user).catch(() => {})
    refresh()
  }, [user, refresh])
  useEffect(() => subscribeContentUpdates(refresh), [refresh])

  useEffect(() => {
    const from = viewerIndex == null ? 0 : viewerIndex + 1
    preloadPostedItems(scrollRows.slice(from), viewerIndex == null ? 6 : 3)
  }, [scrollRows, viewerIndex])

  useEffect(() => {
    if (!initialPicId || skipAutoOpen.current) return
    const idx = scrollRows.findIndex((row) => row.item?.id === initialPicId)
    if (idx >= 0) {
      setOpenedAt(idx)
      setViewerIndex(idx)
    }
  }, [initialPicId, scrollRows])

  const closeViewer = () => {
    skipAutoOpen.current = true
    setViewerIndex(null)
    replaceHash('pics')
  }

  const openPic = (pic) => {
    const idx = scrollRows.findIndex((row) => row.item?.id === pic.id)
    const at = idx >= 0 ? idx : 0
    setOpenedAt(at)
    setViewerIndex(at)
    if (pic?.id && typeof window !== 'undefined') {
      replaceHash('content', pic.id)
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
          count={scrollRows.length}
          activeIndex={viewerIndex}
          goToRef={goToRef}
          loop={scrollRows.length >= 2}
          onActiveIndex={(i) => {
            setViewerIndex(i)
            const pic = scrollRows[i]?.item
            if (pic && typeof window !== 'undefined') {
              replaceHash('content', pic.id)
            }
          }}
          initialIndex={openedAt}
          header={(
            <div className="shrink-0 flex items-center justify-between px-3 py-2">
              <button type="button" onClick={closeViewer} className="h-9 px-3 rounded-full bg-white/10 text-white text-xs inline-flex items-center gap-1.5">
                <X className="h-4 w-4" /> Back to pics
              </button>
              <p className="text-[11px] text-white/50">{viewerIndex + 1}/{scrollRows.length}</p>
            </div>
          )}
          renderSlide={(index, active, warm) => {
            const pic = scrollRows[index]?.item
            return pic ? (
              <PicSlide
                pic={pic}
                active={active}
                onOpenProfile={onOpenProfile}
                onOpenAuth={onOpenAuth}
                eager={active || warm}
              />
            ) : null
          }}
        />
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto bg-[#000000]">
      <div className="sticky top-0 z-10 border-b border-zinc-800/80 bg-[#000000]/95 backdrop-blur px-4 py-3 flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-zinc-100">Pics</h1>
        <button type="button" onClick={openUpload} disabled={busy} className="h-9 px-4 rounded-full bg-white text-black text-sm font-semibold disabled:opacity-60 inline-flex items-center gap-1.5">
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
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1 p-1 pb-20">
          {shuffled.map((pic) => (
            <MosaicPicTile
              key={pic.id}
              pic={pic}
              onOpen={() => openPic(pic)}
              onOpenAuth={onOpenAuth}
              onUnplayable={dropBroken}
            />
          ))}
        </div>
      )}
    </div>
  )
}
