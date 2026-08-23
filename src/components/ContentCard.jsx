import { useState, useRef, useEffect } from 'react'
import { ThumbsUp, ThumbsDown, MessageCircle, Flag, Share2, Bookmark, Play, MoreHorizontal } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
  getVotes, getUserVote, toggleVote, getViews, recordView, getSubscriberCount,
} from '../lib/engagement'
import { recordInteraction } from '../lib/algorithmEngine'
import { toggleSaved, getSaved } from '../lib/storage'
import { cn } from '../lib/utils'
import CommentsPanel from './CommentsPanel'
import ReportModal from './ReportModal'

function formatDuration(sec) {
  if (!sec || sec <= 0) return null
  return `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`
}

/** video = landscape 16:9 grid card; short = vertical 9:16 shelf card */
export default function ContentCard({ item, onOpen, variant }) {
  const { user, isAuthenticated } = useAuth()
  const [votes, setVotes] = useState(() => getVotes(item?.id))
  const [myVote, setMyVote] = useState(() => getUserVote(user?.id, item?.id))
  const [views, setViews] = useState(() => getViews(item?.id))
  const [isSaved, setIsSaved] = useState(() => (getSaved() || []).includes(item?.id))
  const [copied, setCopied] = useState(false)
  const [pulse, setPulse] = useState(null)
  const [showComments, setShowComments] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const viewStartTime = useRef(null)
  const moreRef = useRef(null)

  const mode = variant || (item?.type === 'video' ? 'video' : 'short')

  useEffect(() => {
    viewStartTime.current = Date.now()
    const tags = item?.tags || []
    const cid = item?.creatorId || item?.userId
    const itemId = item?.id
    const uid = user?.id
    return () => {
      if (viewStartTime.current) {
        const durationMs = Date.now() - viewStartTime.current
        if (uid && itemId && durationMs < 1800) {
          recordInteraction(uid, { contentId: itemId, type: 'early_skip', tags, creatorId: cid })
        }
      }
    }
  }, [item?.id, item?.tags, item?.creatorId, item?.userId, user?.id])

  useEffect(() => {
    if (!moreOpen) return
    const onDoc = (e) => {
      if (moreRef.current && !moreRef.current.contains(e.target)) setMoreOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [moreOpen])

  if (!item) return null

  const open = () => {
    const n = recordView(item.id)
    setViews(n)
    if (user?.id) {
      recordInteraction(user.id, {
        contentId: item.id,
        type: 'complete',
        watchRatio: 1,
        title: item.title,
        tags: item.tags || [],
        creatorId: item.creatorId || item.userId,
        platform: item.platform || item.origin,
      })
    }
    if (onOpen) onOpen(item)
    else if (item.sourceUrl) window.open(item.sourceUrl, '_blank', 'noopener,noreferrer')
  }

  const vote = (dir, e) => {
    e.stopPropagation()
    if (!isAuthenticated) return
    const next = toggleVote(user.id, item.id, dir)
    setVotes({ ...next })
    setMyVote(getUserVote(user.id, item.id))
    setPulse(dir)
    setTimeout(() => setPulse(null), 400)
    recordInteraction(user.id, {
      contentId: item.id,
      type: dir === 'up' ? 'upvote' : 'downvote',
      tags: item.tags || [],
      creatorId: item.creatorId || item.userId,
    })
  }

  const handleShare = async (e) => {
    e.stopPropagation()
    const url = item.sourceUrl || window.location.href
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
      if (user?.id) {
        recordInteraction(user.id, { contentId: item.id, type: 'share', tags: item.tags || [], creatorId: item.creatorId || item.userId })
      }
    } catch {}
  }

  const handleSave = (e) => {
    e.stopPropagation()
    const next = toggleSaved(item.id)
    const savedNow = next.includes(item.id)
    setIsSaved(savedNow)
    if (user?.id && savedNow) {
      recordInteraction(user.id, { contentId: item.id, type: 'save', tags: item.tags || [], creatorId: item.creatorId || item.userId })
    }
  }

  const thumb = item.thumbUrl || item.mediaUrl
  const subs = item.creatorId ? getSubscriberCount(item.creatorId) : 0
  const handle = item.handle ? `@${String(item.handle).replace(/^@/, '')}` : 'Creator'
  const duration = formatDuration(item.durationSec)
  const reportTarget = { id: item.id, contentId: item.id, userId: item.creatorId || item.userId, handle: item.handle }

  // Standard video: metadata (title/handle/views) lives below the fixed 16:9
  // media box, never overlapping the thumbnail canvas.
  if (mode === 'video') {
    return (
      <div className="group rounded-xl overflow-hidden w-full flex flex-col">
        <button type="button" onClick={open} className="w-full text-left">
          <div className="aspect-video w-full bg-zinc-900 relative overflow-hidden rounded-xl">
            {thumb ? (
              <img src={thumb} alt="" className="h-full w-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-zinc-600 text-xs">No thumb</div>
            )}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
              <span className="h-12 w-12 rounded-full bg-black/70 flex items-center justify-center"><Play className="h-6 w-6 text-white ml-0.5" /></span>
            </div>
            {duration && (
              <span className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 text-[10px] text-white font-medium">{duration}</span>
            )}
          </div>
        </button>
        <button type="button" onClick={open} className="w-full text-left flex gap-3 pt-3">
          <div className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold shrink-0">
            {(item.creatorName || item.handle || '?')[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-zinc-100 line-clamp-2 leading-snug">{item.title || 'Untitled'}</p>
            <p className="text-xs text-zinc-500 mt-1">{handle}{subs > 0 ? ` · ${subs} subscribers` : ''}</p>
            <p className="text-xs text-zinc-500">{views} views</p>
            {item.description ? (
              <p className="text-xs text-zinc-600 mt-1 line-clamp-2">{item.description}</p>
            ) : null}
          </div>
        </button>
        <div className="pt-3 flex items-center gap-1.5 sm:gap-2 flex-nowrap overflow-x-auto">
          <button type="button" onClick={(e) => vote('up', e)} className={cn('inline-flex items-center gap-1 h-8 px-2.5 rounded-full border text-xs shrink-0', myVote === 'up' ? 'border-white text-white bg-white/10' : 'border-zinc-800 text-zinc-400', pulse === 'up' && 'scale-125')}>
            <ThumbsUp className="h-3.5 w-3.5" />{votes.up}
          </button>
          <button type="button" onClick={(e) => vote('down', e)} className={cn('inline-flex items-center gap-1 h-8 px-2 rounded-full border text-xs shrink-0', myVote === 'down' ? 'border-red-400 text-red-400' : 'border-zinc-800 text-zinc-400')}>
            <ThumbsDown className="h-3.5 w-3.5" />{votes.down}
          </button>
          <button type="button" onClick={(e) => { e.stopPropagation(); setShowComments((v) => !v) }} className="inline-flex items-center gap-1 h-8 px-2.5 rounded-full border border-zinc-800 text-zinc-400 text-xs shrink-0">
            <MessageCircle className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={handleSave} className={cn('h-8 px-2 rounded-full border text-xs shrink-0', isSaved ? 'border-white text-white' : 'border-zinc-800 text-zinc-400')}>
            <Bookmark className={cn('h-3.5 w-3.5', isSaved && 'fill-current')} />
          </button>
          <button type="button" onClick={handleShare} className="h-8 px-2 rounded-full border border-zinc-800 text-zinc-400 text-xs shrink-0">
            <Share2 className="h-3.5 w-3.5" />{copied && <span className="text-[10px] ml-1">Copied</span>}
          </button>
          <button type="button" onClick={(e) => { e.stopPropagation(); setReportOpen(true) }} className="h-8 px-2 rounded-full border border-zinc-800 text-zinc-400 text-xs shrink-0 ml-auto">
            <Flag className="h-3.5 w-3.5" />
          </button>
        </div>
        {showComments && <div className="pt-3"><CommentsPanel contentId={item.id} creatorId={item.creatorId || item.userId} /></div>}
        <ReportModal open={reportOpen} onClose={() => setReportOpen(false)} target={reportTarget} />
      </div>
    )
  }

  // Clip: fixed-width shelf tile. Media box only holds the thumbnail, play
  // affordance, and duration badge — title/handle/views sit in their own
  // padded block underneath so text never bleeds over the video canvas, and
  // the action row is icon-only + non-wrapping so it always fits the tile.
  return (
    <div className="group rounded-xl border border-zinc-800 bg-[#121218] overflow-hidden hover:border-white/25 transition-all w-full flex flex-col h-full">
      <button type="button" onClick={open} className="w-full text-left shrink-0">
        <div className="aspect-[9/16] w-full bg-zinc-900 relative overflow-hidden">
          {thumb ? (
            <img src={thumb} alt="" className="h-full w-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-zinc-600 text-xs">No thumb</div>
          )}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
            <span className="h-10 w-10 rounded-full bg-black/70 flex items-center justify-center"><Play className="h-5 w-5 text-white ml-0.5" /></span>
          </div>
          {duration && (
            <span className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 text-[10px] text-white font-medium">{duration}</span>
          )}
        </div>
      </button>

      <button type="button" onClick={open} className="w-full text-left px-2.5 pt-2 flex-1 min-h-0">
        <p className="text-xs font-semibold text-zinc-100 line-clamp-2 leading-snug">{item.title || 'Untitled'}</p>
        <p className="text-[11px] text-zinc-500 mt-1 truncate">{handle} · {views} views</p>
      </button>

      <div className="px-2 pb-2 pt-1.5 flex items-center justify-between gap-1 flex-nowrap relative">
        <button type="button" onClick={(e) => vote('up', e)} className={cn('inline-flex items-center gap-1 h-7 px-2 rounded-full border text-[11px] shrink-0', myVote === 'up' ? 'border-white text-white bg-white/10' : 'border-zinc-800 text-zinc-400', pulse === 'up' && 'scale-125')}>
          <ThumbsUp className="h-3 w-3" />{votes.up}
        </button>
        <button type="button" onClick={handleSave} className={cn('h-7 w-7 shrink-0 rounded-full border flex items-center justify-center', isSaved ? 'border-white text-white' : 'border-zinc-800 text-zinc-400')} aria-label="Save">
          <Bookmark className={cn('h-3.5 w-3.5', isSaved && 'fill-current')} />
        </button>
        <button type="button" onClick={handleShare} className="h-7 w-7 shrink-0 rounded-full border border-zinc-800 text-zinc-400 flex items-center justify-center" aria-label="Share">
          <Share2 className="h-3.5 w-3.5" />
        </button>
        <div ref={moreRef} className="relative shrink-0">
          <button type="button" onClick={(e) => { e.stopPropagation(); setMoreOpen((v) => !v) }} className="h-7 w-7 rounded-full border border-zinc-800 text-zinc-400 flex items-center justify-center" aria-label="More actions">
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
          {moreOpen && (
            <div className="absolute right-0 bottom-9 z-20 w-40 rounded-xl border border-zinc-800 bg-[#18181f] shadow-2xl py-1 text-left">
              <button type="button" onClick={(e) => { vote('down', e); setMoreOpen(false) }} className={cn('w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-zinc-800', myVote === 'down' ? 'text-red-400' : 'text-zinc-300')}>
                <ThumbsDown className="h-3.5 w-3.5" /> Dislike ({votes.down})
              </button>
              <button type="button" onClick={(e) => { e.stopPropagation(); setShowComments((v) => !v); setMoreOpen(false) }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800">
                <MessageCircle className="h-3.5 w-3.5" /> Comments
              </button>
              <button type="button" onClick={(e) => { e.stopPropagation(); setReportOpen(true); setMoreOpen(false) }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800">
                <Flag className="h-3.5 w-3.5" /> Report
              </button>
            </div>
          )}
        </div>
        {copied && <span className="absolute -top-6 right-1 text-[10px] rounded bg-black/80 px-1.5 py-0.5 text-white">Copied</span>}
      </div>

      {showComments && <div className="px-2.5 pb-2.5"><CommentsPanel contentId={item.id} creatorId={item.creatorId || item.userId} /></div>}
      <ReportModal open={reportOpen} onClose={() => setReportOpen(false)} target={reportTarget} />
    </div>
  )
}
