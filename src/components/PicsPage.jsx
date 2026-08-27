import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { X, Share2, Download, Heart } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getPicsFeed, pickImmediatePhotoSrc, isHttpUrl, isDataImageUrl } from '../lib/picsService'
import { isFeedable, hideBrokenMedia } from '../lib/catalogHealth'
import { isPicHearted, togglePicHeart } from '../lib/picHearts'
import { recordView } from '../lib/engagement'
import { recordInteraction } from '../lib/algorithmEngine'
import { useContentSyncTick } from '../lib/useContentSync'
import { subscribeContentUpdates } from '../lib/contentSync'
import { getMediaBlobUrl } from '../lib/videoStorage'
import { copyShareUrl, replaceHash } from '../lib/routes'
import ShortsStage, { ShortsCard } from './ShortsStage'
import { downloadPostedMedia } from '../lib/mediaDownload'
import { preloadPostedItems } from '../lib/preloadMedia'
import { cn } from '../lib/utils'
import PicsCanvasGallery from './PicsCanvasGallery'

function PicImage({ pic, className, alt = '', full = false, fill = false, eager = false, onUnplayable, style }) {
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

  if (failed || !src) {
    return (
      <div className={cn('flex items-center justify-center bg-zinc-900 text-zinc-500 text-xs', fill ? 'absolute inset-0' : className)}>
        Image unavailable
      </div>
    )
  }

  if (fill) {
    return (
      <img
        src={src}
        alt={alt}
        className="absolute inset-0 h-full w-full object-cover"
        style={style}
        onError={onError}
        decoding="async"
        loading={eager ? 'eager' : 'lazy'}
        draggable={false}
      />
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      onError={onError}
      decoding="async"
      loading={eager ? 'eager' : 'lazy'}
      draggable={false}
    />
  )
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
    togglePicHeart(pic.id, {
      creatorId: pic.creatorId || pic.userId,
      actorId: user.id,
      title: pic.title,
    })
    setBurst(true)
    setTimeout(() => setBurst(false), 450)
  }
  return (
    <>
      <button type="button" onClick={toggle} className={cn('flex flex-col items-center gap-1', className)} aria-label={hearted ? 'Unheart' : 'Heart'}>
        <span className={cn('h-11 w-11 rounded-full flex items-center justify-center text-white', hearted ? 'bg-red-500/90' : 'bg-[#272727]')}>
          <Heart className={cn('h-5 w-5', hearted && 'fill-current')} />
        </span>
      </button>
      {burst ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <Heart className="h-20 w-20 text-red-400 fill-red-400 drop-shadow-lg" />
        </div>
      ) : null}
    </>
  )
}

/** Focus view: contain by default; wheel zooms image overflow; drag pans overflow. */
function FocusPicImage({ pic, active, eager }) {
  const wrapRef = useRef(null)
  const [scale, setScale] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const scaleRef = useRef(1)
  const panRef = useRef({ x: 0, y: 0 })
  const dragRef = useRef(null)
  scaleRef.current = scale
  panRef.current = pan

  useEffect(() => {
    setScale(1)
    setPan({ x: 0, y: 0 })
  }, [pic.id])

  useEffect(() => {
    if (!active) return undefined
    const el = wrapRef.current
    if (!el) return undefined
    const onWheel = (e) => {
      // Vertical reel nav at scale 1 uses ShortsStage; when zoomed, pan/zoom the photo.
      if (scaleRef.current <= 1.02 && Math.abs(e.deltaY) > Math.abs(e.deltaX)) return
      e.preventDefault()
      e.stopPropagation()
      const rect = el.getBoundingClientRect()
      const sx = e.clientX - rect.left
      const sy = e.clientY - rect.top
      const prev = scaleRef.current
      const factor = e.deltaY > 0 ? 0.9 : 1.12
      const next = Math.min(8, Math.max(1, prev * factor))
      if (next === prev) return
      const wx = (sx - panRef.current.x) / prev
      const wy = (sy - panRef.current.y) / prev
      const nextPan = { x: sx - wx * next, y: sy - wy * next }
      setScale(next)
      setPan(next === 1 ? { x: 0, y: 0 } : nextPan)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [active])

  const onPointerDown = (e) => {
    if (scaleRef.current <= 1.02) return
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* ignore */ }
    dragRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: panRef.current.x,
      panY: panRef.current.y,
    }
  }
  const onPointerMove = (e) => {
    if (!dragRef.current) return
    setPan({
      x: dragRef.current.panX + (e.clientX - dragRef.current.x),
      y: dragRef.current.panY + (e.clientY - dragRef.current.y),
    })
  }
  const onPointerUp = () => { dragRef.current = null }

  return (
    <div
      ref={wrapRef}
      className="absolute inset-0 overflow-hidden bg-black flex items-center justify-center touch-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
          transformOrigin: 'center center',
          willChange: 'transform',
        }}
        className="flex h-full w-full items-center justify-center"
      >
        <PicImage
          pic={pic}
          full
          eager={eager}
          className="max-h-full max-w-full w-auto h-auto object-contain select-none"
        />
      </div>
    </div>
  )
}

function PicSlide({ pic, active, onOpenProfile, onOpenAuth, eager = true }) {
  const { user } = useAuth()
  const [shareCopied, setShareCopied] = useState(false)
  const share = async (e) => {
    e?.stopPropagation?.()
    try {
      await copyShareUrl('pic', pic.id)
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 1800)
      if (user?.id) {
        recordInteraction(user.id, {
          contentId: pic.id,
          type: 'share',
          tags: pic.tags || [],
          creatorId: pic.creatorId || pic.userId,
          title: pic.title,
          surface: 'pics',
          contentType: 'pic',
        })
      }
    } catch {}
  }
  const handle = pic.handle ? `@${String(pic.handle).replace(/^@/, '')}` : ''
  const attach = pic.attachments?.[0]
  const actions = (
    <>
      <PicHeartBtn pic={pic} active={active} onOpenAuth={onOpenAuth} />
      <button type="button" onClick={share} className="flex flex-col items-center gap-1">
        <span className="h-11 w-11 rounded-full bg-[#272727] flex items-center justify-center text-white">
          <Share2 className="h-5 w-5" />
        </span>
        <span className="text-[11px] text-white font-medium drop-shadow">{shareCopied ? 'Copied' : 'Share'}</span>
      </button>
      <button type="button" onClick={() => downloadPostedMedia(pic)} className="flex flex-col items-center gap-1">
        <span className="h-11 w-11 rounded-full bg-[#272727] flex items-center justify-center text-white">
          <Download className="h-5 w-5" />
        </span>
      </button>
    </>
  )

  return (
    <ShortsCard actions={actions}>
      <FocusPicImage pic={pic} active={active} eager={eager} />
      {attach?.url && (attach.type === 'video' || attach.type === 'gif') ? (
        <video
          src={attach.url}
          className="absolute bottom-16 right-4 w-28 sm:w-36 border border-white/20 shadow-lg object-cover aspect-[9/16] bg-black"
          muted
          loop
          playsInline
          autoPlay={active}
        />
      ) : null}
      {attach?.type === 'live' ? (
        <span className="absolute top-4 left-4 bg-[#eb0400] text-white text-[10px] font-bold uppercase px-2 py-1">
          Live attached
        </span>
      ) : null}
      {handle ? (
        <div className="absolute inset-x-0 bottom-0 z-10">
          <div className="pt-16 pb-2 px-3 bg-gradient-to-t from-black/70 to-transparent">
            <button type="button" onClick={() => onOpenProfile?.(pic.handle, pic.creatorId)} className="text-sm font-semibold text-white">
              {handle}
            </button>
          </div>
        </div>
      ) : null}
      <div className="md:hidden absolute right-2 bottom-32 z-10 flex flex-col items-center gap-5">{actions}</div>
    </ShortsCard>
  )
}

export default function PicsPage({ onOpenAuth, onOpenProfile, initialPicId }) {
  const { user } = useAuth()
  const [items, setItems] = useState(() => getPicsFeed())
  const [viewerIndex, setViewerIndex] = useState(() => (initialPicId ? 0 : null))
  const [openedAt, setOpenedAt] = useState(0)
  const [camera, setCamera] = useState(null)
  const goToRef = useRef(null)
  const skipAutoOpen = useRef(false)
  const selfNav = useRef(false)

  // Stable catalog order — do not reshuffle on every URL change.
  const scrollItems = useMemo(() => {
    const list = (items || []).filter(isFeedable)
    if (!initialPicId) return list
    if (list.some((p) => p.id === initialPicId)) return list
    return list
  }, [items, initialPicId])

  const refresh = useCallback(() => setItems(getPicsFeed()), [])
  const dropBroken = useCallback((id) => {
    // Session hide only — never delete cloud catalog from a decode/CDN error.
    hideBrokenMedia(id)
    refresh()
  }, [refresh])

  useEffect(() => subscribeContentUpdates(refresh), [refresh])
  useEffect(() => {
    const from = viewerIndex == null ? 0 : viewerIndex + 1
    preloadPostedItems(scrollItems.slice(from), viewerIndex == null ? 6 : 3)
  }, [scrollItems, viewerIndex])

  useEffect(() => {
    if (!initialPicId || skipAutoOpen.current) return
    if (selfNav.current) {
      selfNav.current = false
      return
    }
    const idx = scrollItems.findIndex((p) => p.id === initialPicId)
    if (idx >= 0) {
      setOpenedAt(idx)
      setViewerIndex(idx)
    }
  }, [initialPicId, scrollItems])

  const closeViewer = () => {
    skipAutoOpen.current = true
    setViewerIndex(null)
    replaceHash('pics')
  }

  const enterPic = useCallback((idx, id) => {
    skipAutoOpen.current = false
    setOpenedAt(idx)
    setViewerIndex(idx)
    if (id) {
      selfNav.current = true
      replaceHash('content', id)
    }
  }, [])

  useEffect(() => {
    if (viewerIndex == null) return
    const pic = scrollItems[viewerIndex]
    if (!pic?.id) return
    // Count once per opened pic — do not depend on scrollItems identity
    // (catalog refresh used to re-fire forever and crash the page).
    recordView(pic.id, {
      creatorId: pic.creatorId || pic.userId,
      title: pic.title,
      actorId: user?.id || null,
      surface: 'pics',
      contentType: 'pic',
    })
  }, [viewerIndex, scrollItems[viewerIndex]?.id, user?.id])

  useEffect(() => {
    if (viewerIndex == null) return
    const onKey = (e) => { if (e.key === 'Escape') closeViewer() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [viewerIndex])

  // Deep-link / canvas zoom-enter opens the reel; then scroll between pics.
  if (viewerIndex != null && scrollItems.length > 0) {
    return (
      <div className="h-full min-h-0 flex flex-col bg-black">
        <ShortsStage
          key="pic-reel"
          count={scrollItems.length}
          activeIndex={viewerIndex}
          goToRef={goToRef}
          loop={scrollItems.length >= 1}
          onActiveIndex={(i) => {
            setViewerIndex(i)
            const pic = scrollItems[i]
            if (pic?.id) {
              selfNav.current = true
              replaceHash('content', pic.id)
            }
          }}
          initialIndex={openedAt}
          header={(
            <div className="shrink-0 flex items-center justify-between px-3 py-2">
              <button type="button" onClick={closeViewer} className="h-9 px-3 bg-white/10 text-white text-xs inline-flex items-center gap-1.5">
                <X className="h-4 w-4" /> Canvas
              </button>
              <p className="text-[11px] text-white/50">{viewerIndex + 1}/{scrollItems.length}</p>
            </div>
          )}
          renderSlide={(index, active, warm) => {
            const pic = scrollItems[index]
            return pic ? (
              <PicSlide pic={pic} active={active} onOpenProfile={onOpenProfile} onOpenAuth={onOpenAuth} eager={active || warm} />
            ) : null
          }}
        />
      </div>
    )
  }

  return (
    <div className="h-full min-h-0 bg-black">
      <PicsCanvasGallery
        items={scrollItems}
        onEnterPic={enterPic}
        onUnplayable={dropBroken}
        restoreCamera={camera}
        onCameraChange={setCamera}
      />
    </div>
  )
}
