import { useMemo, useRef, useEffect, useState, useCallback } from 'react'
import { Clapperboard, Heart, MessageCircle, Share2, Volume2, VolumeX } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getShortsFeed } from '../lib/contentService'
import { getMediaBlobUrl } from '../lib/videoStorage'
import { parseEmbedUrl } from '../lib/videoEmbed'
import { recordView, getViews, toggleVote, getVotes, getUserVote } from '../lib/engagement'
import { recordInteraction } from '../lib/algorithmEngine'

function resolvePlayUrl(item) {
  return item?.mediaUrl || item?.sourceUrl || ''
}

function ClipSlide({ item, active, muted, onToggleMute, user }) {
  const videoRef = useRef(null)
  const [src, setSrc] = useState(() => resolvePlayUrl(item))
  const [embed, setEmbed] = useState(() => parseEmbedUrl(resolvePlayUrl(item)))
  const [votes, setVotes] = useState(() => getVotes(item.id))
  const [myVote, setMyVote] = useState(() => getUserVote(user?.id, item.id))
  const [views, setViews] = useState(() => getViews(item.id))

  useEffect(() => {
    let cancelled = false
    const raw = resolvePlayUrl(item)
    const parsed = parseEmbedUrl(raw)
    setEmbed(parsed)

    ;(async () => {
      try {
        const idb = await getMediaBlobUrl(item.id)
        if (cancelled) return
        if (idb) {
          setSrc(idb)
          setEmbed({ type: 'video', src: idb, platform: 'direct' })
          return
        }
      } catch {}
      if (!cancelled) {
        setSrc(parsed?.src || raw)
      }
    })()

    return () => { cancelled = true }
  }, [item.id, item.mediaUrl, item.sourceUrl])

  useEffect(() => {
    const el = videoRef.current
    if (!el || embed?.type === 'iframe') return
    if (active) {
      el.muted = muted
      const p = el.play()
      if (p?.catch) p.catch(() => {
        el.muted = true
        el.play()?.catch(() => {})
      })
      const n = recordView(item.id)
      setViews(n)
      if (user?.id) {
        recordInteraction(user.id, {
          contentId: item.id,
          type: 'impression',
          tags: item.tags || [],
          creatorId: item.creatorId || item.userId,
        })
      }
    } else {
      el.pause()
      try { el.currentTime = 0 } catch {}
    }
  }, [active, muted, item.id, embed?.type, user?.id])

  const like = (e) => {
    e.stopPropagation()
    if (!user?.id) return
    const next = toggleVote(user.id, item.id, 'up')
    setVotes({ ...next })
    setMyVote(getUserVote(user.id, item.id))
    recordInteraction(user.id, {
      contentId: item.id,
      type: 'upvote',
      tags: item.tags || [],
      creatorId: item.creatorId || item.userId,
    })
  }

  const share = async (e) => {
    e.stopPropagation()
    const url = resolvePlayUrl(item) || window.location.href
    try {
      if (navigator.clipboard) await navigator.clipboard.writeText(url)
      if (user?.id) {
        recordInteraction(user.id, {
          contentId: item.id,
          type: 'share',
          tags: item.tags || [],
          creatorId: item.creatorId || item.userId,
        })
      }
    } catch {}
  }

  const handle = item.handle ? `@${String(item.handle).replace(/^@/, '')}` : '@creator'
  const videoSrc = embed?.src || src
  const isIframe = embed?.type === 'iframe'

  return (
    <section className="relative h-full w-full snap-start snap-always flex items-center justify-center bg-black shrink-0">
      {isIframe && videoSrc ? (
        <iframe
          src={active ? videoSrc : undefined}
          title={item.title || 'Clip'}
          className="absolute inset-0 w-full h-full border-0"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      ) : videoSrc ? (
        <video
          ref={videoRef}
          src={videoSrc}
          className="absolute inset-0 w-full h-full object-contain bg-black"
          playsInline
          loop
          muted={muted}
          preload={active ? 'auto' : 'metadata'}
        />
      ) : (
        <div className="text-zinc-500 text-sm">No media</div>
      )}

      {/* gradient + meta */}
      <div className="absolute inset-x-0 bottom-0 pt-24 pb-6 px-4 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none">
        <p className="text-sm font-semibold text-white drop-shadow">{handle}</p>
        <p className="text-sm text-white/95 mt-1 line-clamp-2 drop-shadow">{item.title || 'Untitled'}</p>
        {item.description ? (
          <p className="text-xs text-white/70 mt-1 line-clamp-2">{item.description}</p>
        ) : null}
        <p className="text-[10px] text-white/50 mt-2">{views} views</p>
      </div>

      {/* side actions */}
      <div className="absolute right-3 bottom-28 flex flex-col items-center gap-4 z-10">
        <button type="button" onClick={like} className="flex flex-col items-center gap-1">
          <span className={`h-11 w-11 rounded-full bg-black/45 backdrop-blur flex items-center justify-center ${myVote === 'up' ? 'text-red-400' : 'text-white'}`}>
            <Heart className={`h-6 w-6 ${myVote === 'up' ? 'fill-current' : ''}`} />
          </span>
          <span className="text-[11px] text-white font-medium">{votes.up || 0}</span>
        </button>
        <button type="button" className="flex flex-col items-center gap-1" title="Comments">
          <span className="h-11 w-11 rounded-full bg-black/45 backdrop-blur flex items-center justify-center text-white">
            <MessageCircle className="h-5 w-5" />
          </span>
        </button>
        <button type="button" onClick={share} className="flex flex-col items-center gap-1">
          <span className="h-11 w-11 rounded-full bg-black/45 backdrop-blur flex items-center justify-center text-white">
            <Share2 className="h-5 w-5" />
          </span>
        </button>
        <button type="button" onClick={onToggleMute} className="h-11 w-11 rounded-full bg-black/45 backdrop-blur flex items-center justify-center text-white">
          {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </button>
      </div>
    </section>
  )
}

export default function ShortsFeed() {
  const { user } = useAuth()
  const items = useMemo(() => getShortsFeed(user?.id || null), [user?.id])
  const scrollerRef = useRef(null)
  const [activeIdx, setActiveIdx] = useState(0)
  const [muted, setMuted] = useState(true)

  const onScroll = useCallback(() => {
    const el = scrollerRef.current
    if (!el || !items.length) return
    const h = el.clientHeight || 1
    const idx = Math.round(el.scrollTop / h)
    setActiveIdx(Math.max(0, Math.min(items.length - 1, idx)))
  }, [items.length])

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [onScroll])

  if (items.length === 0) {
    return (
      <div className="h-full min-h-[60vh] flex items-center justify-center p-6">
        <div className="rounded-2xl border border-zinc-800 bg-[#121218] px-6 py-16 text-center max-w-md">
          <div className="mx-auto h-12 w-12 rounded-full bg-white/15 flex items-center justify-center">
            <Clapperboard className="h-6 w-6 text-white" />
          </div>
          <p className="mt-4 text-sm font-medium text-zinc-200">No clips yet</p>
          <p className="mt-1.5 text-xs text-zinc-500">Upload a Clip from + — this feed scrolls full-screen like Shorts / TikTok.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100dvh-3.5rem)] w-full bg-black relative">
      <div
        ref={scrollerRef}
        className="h-full w-full overflow-y-scroll snap-y snap-mandatory overscroll-y-contain"
        style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
      >
        {items.map((item, i) => (
          <div key={item.id} className="h-full w-full max-w-lg mx-auto">
            <ClipSlide
              item={item}
              active={i === activeIdx}
              muted={muted}
              onToggleMute={() => setMuted((m) => !m)}
              user={user}
            />
          </div>
        ))}
      </div>
      <p className="absolute top-2 left-1/2 -translate-x-1/2 text-[10px] text-white/40 pointer-events-none z-20">
        Swipe up · {activeIdx + 1}/{items.length}
      </p>
    </div>
  )
}
