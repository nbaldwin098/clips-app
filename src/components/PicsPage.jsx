import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { ImagePlus, X, Share2, Download } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getPicsFeed, publishPhoto, pickImmediatePhotoSrc, isHttpUrl, isDataImageUrl } from '../lib/picsService'
import { subscribeContentUpdates, deleteContentRecord } from '../lib/contentSync'
import { hideBrokenMedia } from '../lib/catalogHealth'
import { getMediaBlobUrl } from '../lib/videoStorage'
import { copyShareUrl, replaceHash } from '../lib/routes'
import ShortsStage, { ShortsCard } from './ShortsStage'
import { downloadPostedMedia } from '../lib/mediaDownload'
import { mixFeedAds } from '../lib/adEngine'
import { InFeedAd, PlacementBanner } from './AdUnits'
import ExoClickDisplay from './ExoClickDisplay'
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

function PicSlide({ pic, onOpenProfile, eager = true }) {
  const share = async (e) => {
    e?.stopPropagation?.()
    try { await copyShareUrl('pic', pic.id) } catch {}
  }
  const handle = pic.handle ? `@${String(pic.handle).replace(/^@/, '')}` : ''
  const actions = (
    <>
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
      <div className="absolute inset-0 bg-black flex items-center justify-center">
        <PicImage pic={pic} full eager={eager} className="max-h-full max-w-full w-auto h-auto object-contain" />
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
          <PlacementBanner placement="pic-banner" itemId={pic.id} />
        </div>
      ) : (
        <div className="absolute inset-x-0 bottom-0 z-10">
          <PlacementBanner placement="pic-banner" itemId={pic.id} />
        </div>
      )}
      <div className="md:hidden absolute right-2 bottom-32 z-10">{actions}</div>
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
    const mixed0 = mixFeedAds(getPicsFeed(), 'pic-feed')
    const idx = mixed0.findIndex((r) => r.item?.id === initialPicId)
    return idx >= 0 ? idx : null
  })
  const [openedAt, setOpenedAt] = useState(() => {
    if (!initialPicId) return 0
    const mixed0 = mixFeedAds(getPicsFeed(), 'pic-feed')
    const idx = mixed0.findIndex((r) => r.item?.id === initialPicId)
    return idx >= 0 ? idx : 0
  })

  const mixed = useMemo(() => mixFeedAds(items, 'pic-feed'), [items])
  const skipAutoOpen = useRef(false)
  const refresh = useCallback(() => setItems(getPicsFeed()), [])
  const dropBroken = useCallback((id) => {
    hideBrokenMedia(id)
    deleteContentRecord(id, user)
    refresh()
  }, [user, refresh])
  useEffect(() => subscribeContentUpdates(refresh), [refresh])

  useEffect(() => {
    const from = viewerIndex == null ? 0 : viewerIndex + 1
    preloadPostedItems(mixed.slice(from), viewerIndex == null ? 6 : 3)
  }, [mixed, viewerIndex])

  useEffect(() => {
    if (!initialPicId || skipAutoOpen.current) return
    const idx = mixed.findIndex((r) => r.item?.id === initialPicId)
    if (idx >= 0) {
      setOpenedAt(idx)
      setViewerIndex(idx)
    }
  }, [initialPicId, mixed])

  const closeViewer = () => {
    skipAutoOpen.current = true
    setViewerIndex(null)
    replaceHash('pics')
  }

  const openAt = (mixedIndex) => {
    setOpenedAt(mixedIndex)
    setViewerIndex(mixedIndex)
    const pic = mixed[mixedIndex]?.item
    if (pic && typeof window !== 'undefined') {
      replaceHash('pic', pic.id)
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
          count={mixed.length}
          activeIndex={viewerIndex}
          onActiveIndex={(i) => {
            setViewerIndex(i)
            const pic = mixed[i]?.item
            if (pic && typeof window !== 'undefined') {
              replaceHash('pic', pic.id)
            }
          }}
          initialIndex={openedAt}
          header={(
            <div className="shrink-0 flex items-center justify-between px-3 py-2">
              <button type="button" onClick={closeViewer} className="h-9 px-3 rounded-full bg-white/10 text-white text-xs inline-flex items-center gap-1.5">
                <X className="h-4 w-4" /> Back to pics
              </button>
              <p className="text-[11px] text-white/50">{viewerIndex + 1}/{mixed.length}</p>
            </div>
          )}
          renderSlide={(index, active, warm) => {
            const row = mixed[index]
            if (row?.kind === 'ad') {
              return (
                <div className="h-full w-full bg-black flex flex-col items-center justify-center p-4">
                  <p className="shrink-0 pb-3 text-[11px] text-white/70">Sponsored · swipe for the next pic</p>
                  <div className="w-full max-w-md aspect-square overflow-hidden bg-[#111]">
                    <ExoClickDisplay zoneId={row.ad?.zoneId} />
                  </div>
                </div>
              )
            }
            return row?.item ? <PicSlide pic={row.item} onOpenProfile={onOpenProfile} eager={active || warm} /> : null
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
          {mixed.map((row) => {
            if (row.kind === 'ad') {
              return <InFeedAd key={row.key} ad={row.ad} variant="pic-row" />
            }
            const pic = row.item
            return (
              <button
                key={row.key || pic.id}
                type="button"
                onClick={() => openAt(mixed.findIndex((r) => r.item?.id === pic.id))}
                className="relative block w-full aspect-square overflow-hidden bg-zinc-800 group focus:outline-none"
              >
                <PicImage key={pic.id} pic={pic} fill onUnplayable={dropBroken} />
                <div className="pointer-events-none absolute inset-0 bg-black/0 group-hover:bg-black/35 transition-colors" />
                {pic.title ? (
                  <span className="pointer-events-none absolute bottom-1.5 left-1.5 right-1.5 text-[11px] text-white line-clamp-2 opacity-0 group-hover:opacity-100 drop-shadow">
                    {pic.title}
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
