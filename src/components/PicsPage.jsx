import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { X, Share2, Download, Heart, Film, Radio, Play } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getPicsFeed, pickImmediatePhotoSrc, isHttpUrl, isDataImageUrl } from '../lib/picsService'
import { isFeedable, hideBrokenMedia } from '../lib/catalogHealth'
import { isPicHearted, togglePicHeart } from '../lib/picHearts'
import { recordView } from '../lib/engagement'
import { recordInteraction } from '../lib/algorithmEngine'
import { useContentSyncTick } from '../lib/useContentSync'
import { subscribeContentUpdates } from '../lib/contentSync'
import { deleteCatalogItem } from '../lib/contentService'
import { getMediaBlobUrl } from '../lib/videoStorage'
import { copyShareUrl, replaceHash } from '../lib/routes'
import ShortsStage, { ShortsCard } from './ShortsStage'
import { downloadPostedMedia } from '../lib/mediaDownload'
import { preloadPostedItems } from '../lib/preloadMedia'
import { cn } from '../lib/utils'

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

function AttachmentBadge({ attachments }) {
  if (!attachments?.length) return null
  const a = attachments[0]
  const Icon = a.type === 'live' ? Radio : a.type === 'gif' ? Play : Film
  return (
    <span className="absolute bottom-1 left-1 z-10 inline-flex items-center gap-0.5 bg-black/70 px-1 py-0.5 text-[9px] font-semibold uppercase text-white">
      <Icon className="h-2.5 w-2.5" />
      {a.type}
    </span>
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
      <div className="absolute inset-0 bg-black flex items-center justify-center">
        <PicImage pic={pic} full eager={eager} className="max-h-full max-w-full w-auto h-auto object-contain" />
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
      </div>
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

/**
 * Mosaic under the header. Wheel zooms the photo under the cursor only
 * (not the whole page). Zoom stops when that photo fills the view;
 * then zoom out or return to the mosaic and scroll.
 */
function ZoomMosaic({ items, onOpenAuth, onUnplayable }) {
  const wrapRef = useRef(null)
  const tileRefs = useRef(new Map())
  const { user } = useAuth()
  const syncTick = useContentSyncTick()
  // focus: photo under cursor being zoomed
  const [focus, setFocus] = useState(null) // { id, zoom, ox, oy }
  const MAX_ZOOM = 2.75

  const setTileRef = (id, el) => {
    if (!el) tileRefs.current.delete(id)
    else tileRefs.current.set(id, el)
  }

  const tileUnderPoint = (clientX, clientY) => {
    for (const [id, el] of tileRefs.current.entries()) {
      const r = el.getBoundingClientRect()
      if (clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom) {
        const ox = ((clientX - r.left) / Math.max(1, r.width)) * 100
        const oy = ((clientY - r.top) / Math.max(1, r.height)) * 100
        return { id, ox, oy, rect: r }
      }
    }
    return null
  }

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return undefined
    const onWheel = (e) => {
      const hit = tileUnderPoint(e.clientX, e.clientY)
      const zoomingOut = e.deltaY > 0

      // Zooming a photo under the cursor — never scale the whole mosaic.
      if (focus || hit) {
        const targetId = focus?.id || hit?.id
        if (!targetId) return

        // If zooming in with no focus, must be over a tile
        if (!focus && zoomingOut) return // let page scroll
        if (!focus && !hit) return

        e.preventDefault()
        const factor = zoomingOut ? 0.88 : 1.14
        const ox = hit?.ox ?? focus?.ox ?? 50
        const oy = hit?.oy ?? focus?.oy ?? 50

        setFocus((prev) => {
          const base = prev?.id === targetId ? prev.zoom : 1
          let next = base * factor
          if (next <= 1.04) return null
          // Stop when the photo fills the view — no endless 5× page zoom
          next = Math.min(MAX_ZOOM, next)
          if (!zoomingOut && base >= MAX_ZOOM - 0.01) {
            return { id: targetId, zoom: MAX_ZOOM, ox, oy }
          }
          return { id: targetId, zoom: next, ox, oy }
        })
        return
      }
      // Not over a focused/hovered tile — normal mosaic scroll
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [focus])

  const focusedPic = focus ? items.find((p) => p.id === focus.id) : null
  const atPhoto = Boolean(focus && focus.zoom >= MAX_ZOOM - 0.05)

  const gridClass = 'grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-0.5 p-0.5'

  return (
    <div ref={wrapRef} className="h-full min-h-0 overflow-y-auto bg-black relative">
      {items.length === 0 ? (
        <div className="px-6 py-24 text-center">
          <p className="text-sm text-zinc-500">No pics yet — post from Create (+)</p>
        </div>
      ) : (
        <div className={gridClass}>
          {items.map((pic) => {
            const hearted = isPicHearted(pic.id)
            const isFocus = focus?.id === pic.id
            const z = isFocus ? focus.zoom : 1
            const ox = isFocus ? focus.ox : 50
            const oy = isFocus ? focus.oy : 50
            return (
              <div
                key={pic.id}
                ref={(node) => setTileRef(pic.id, node)}
                className={cn(
                  'relative aspect-square overflow-hidden bg-zinc-900',
                  isFocus && z > 1.2 ? 'z-10 ring-1 ring-white/40' : ''
                )}
              >
                <div
                  className="absolute inset-0 will-change-transform"
                  style={{
                    transform: `scale(${z})`,
                    transformOrigin: `${ox}% ${oy}%`,
                  }}
                >
                  <PicImage pic={pic} fill onUnplayable={onUnplayable} />
                </div>
                <AttachmentBadge attachments={pic.attachments} />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (!user?.id) { onOpenAuth?.(); return }
                    togglePicHeart(pic.id, {
                      creatorId: pic.creatorId || pic.userId,
                      actorId: user.id,
                      title: pic.title,
                    })
                  }}
                  className={cn(
                    'absolute top-1 right-1 z-10 h-6 w-6 flex items-center justify-center text-white',
                    hearted ? 'opacity-100' : 'opacity-0 hover:opacity-100'
                  )}
                  aria-label={hearted ? 'Unheart' : 'Heart'}
                >
                  <Heart className={cn('h-3.5 w-3.5 drop-shadow', hearted && 'fill-red-500 text-red-500')} />
                </button>
                <span className="sr-only">{syncTick}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Arrived at photo — fill the view; scroll mosaic is paused until zoom out */}
      {focusedPic && atPhoto ? (
        <div
          className="fixed inset-0 z-40 bg-black/95 flex items-center justify-center"
          onWheel={(e) => {
            e.preventDefault()
            e.stopPropagation()
            if (e.deltaY > 0) {
              setFocus((prev) => {
                if (!prev) return null
                const next = prev.zoom * 0.85
                if (next <= 1.04) return null
                return { ...prev, zoom: next }
              })
            }
            // Zoom-in blocked — already at the photo
          }}
        >
          <div className="relative max-h-[100dvh] max-w-[100vw] w-full h-full">
            <PicImage
              pic={focusedPic}
              full
              eager
              className="absolute inset-0 h-full w-full object-contain"
            />
            <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[11px] text-zinc-400 bg-black/60 px-3 py-1">
              Scroll to zoom out · or
              <button
                type="button"
                className="ml-1 underline text-zinc-200"
                onClick={() => setFocus(null)}
              >
                back to mosaic
              </button>
            </p>
          </div>
        </div>
      ) : null}

      {focus && !atPhoto ? (
        <div className="pointer-events-none fixed bottom-3 left-1/2 -translate-x-1/2 z-30 px-3 py-1 bg-black/70 text-[11px] text-zinc-300">
          Zoom into photo · scroll out to leave
        </div>
      ) : null}
    </div>
  )
}

export default function PicsPage({ onOpenAuth, onOpenProfile, initialPicId }) {
  const { user } = useAuth()
  const [items, setItems] = useState(() => getPicsFeed())
  const [viewerIndex, setViewerIndex] = useState(() => (initialPicId ? 0 : null))
  const [openedAt, setOpenedAt] = useState(0)
  const goToRef = useRef(null)
  const skipAutoOpen = useRef(false)

  const scrollItems = useMemo(() => {
    const list = (items || []).filter(isFeedable)
    if (!initialPicId) return list
    const focused = list.find((p) => p.id === initialPicId)
    const rest = list.filter((p) => p.id !== initialPicId)
    return focused && isFeedable(focused) ? [focused, ...rest] : list
  }, [items, initialPicId])

  const refresh = useCallback(() => setItems(getPicsFeed()), [])
  const dropBroken = useCallback((id) => {
    hideBrokenMedia(id)
    deleteCatalogItem(id, user).catch(() => {})
    refresh()
  }, [user, refresh])

  useEffect(() => subscribeContentUpdates(refresh), [refresh])
  useEffect(() => {
    const from = viewerIndex == null ? 0 : viewerIndex + 1
    preloadPostedItems(scrollItems.slice(from), viewerIndex == null ? 6 : 3)
  }, [scrollItems, viewerIndex])

  useEffect(() => {
    if (!initialPicId || skipAutoOpen.current) return
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

  // Deep-link / share opens the reel; mosaic itself is zoom-first (no title, no upload).
  if (viewerIndex != null && scrollItems.length > 0) {
    return (
      <div className="h-full min-h-0 flex flex-col bg-black">
        <ShortsStage
          key={`pic-reel-${openedAt}`}
          count={scrollItems.length}
          activeIndex={viewerIndex}
          goToRef={goToRef}
          loop={scrollItems.length >= 1}
          onActiveIndex={(i) => {
            setViewerIndex(i)
            const pic = scrollItems[i]
            if (pic && typeof window !== 'undefined') replaceHash('content', pic.id)
          }}
          initialIndex={openedAt}
          header={(
            <div className="shrink-0 flex items-center justify-between px-3 py-2">
              <button type="button" onClick={closeViewer} className="h-9 px-3 bg-white/10 text-white text-xs inline-flex items-center gap-1.5">
                <X className="h-4 w-4" /> Mosaic
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
      <ZoomMosaic items={scrollItems} onOpenAuth={onOpenAuth} onUnplayable={dropBroken} />
    </div>
  )
}
