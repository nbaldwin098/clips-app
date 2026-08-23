import { useState, useRef, useEffect } from 'react'
import { ThumbsUp, ThumbsDown, Eye, MessageCircle, Flag, Share2, Bookmark, Play, Music } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
  getVotes, getUserVote, toggleVote, getViews, recordView, getSubscriberCount,
} from '../lib/engagement'
import { recordInteraction } from '../lib/algorithmEngine'
import { toggleSaved, getSaved } from '../lib/storage'
import { cn } from '../lib/utils'
import CommentsPanel from './CommentsPanel'
import ReportModal from './ReportModal'

/** video = YouTube row card; short = Shorts-style vertical */
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
  const viewStartTime = useRef(null)

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

  const actions = (
    <div className="px-3 pb-3 flex items-center gap-1.5 sm:gap-2 flex-wrap">
      <button type="button" onClick={(e) => vote('up', e)} className={cn('inline-flex items-center gap-1 h-8 px-2.5 rounded-full border text-xs', myVote === 'up' ? 'border-white text-white bg-white/10' : 'border-zinc-800 text-zinc-400', pulse === 'up' && 'scale-125')}>
        <ThumbsUp className="h-3.5 w-3.5" />{votes.up}
      </button>
      <button type="button" onClick={(e) => vote('down', e)} className={cn('inline-flex items-center gap-1 h-8 px-2 rounded-full border text-xs', myVote === 'down' ? 'border-red-400 text-red-400' : 'border-zinc-800 text-zinc-400')}>
        <ThumbsDown className="h-3.5 w-3.5" />{votes.down}
      </button>
      <button type="button" onClick={(e) => { e.stopPropagation(); setShowComments((v) => !v) }} className="inline-flex items-center gap-1 h-8 px-2.5 rounded-full border border-zinc-800 text-zinc-400 text-xs">
        <MessageCircle className="h-3.5 w-3.5" />
      </button>
      <button type="button" onClick={handleSave} className={cn('h-8 px-2 rounded-full border text-xs', isSaved ? 'border-white text-white' : 'border-zinc-800 text-zinc-400')}>
        <Bookmark className={cn('h-3.5 w-3.5', isSaved && 'fill-current')} />
      </button>
      <button type="button" onClick={handleShare} className="h-8 px-2 rounded-full border border-zinc-800 text-zinc-400 text-xs">
        <Share2 className="h-3.5 w-3.5" />{copied && <span className="text-[10px] ml-1">Copied</span>}
      </button>
      <button type="button" onClick={(e) => { e.stopPropagation(); setReportOpen(true) }} className="h-8 px-2 rounded-full border border-zinc-800 text-zinc-400 text-xs ml-auto">
        <Flag className="h-3.5 w-3.5" />
      </button>
    </div>
  )

  // YouTube-style horizontal video card
  if (mode === 'video') {
    return (
      <div className="group rounded-xl overflow-hidden w-full">
        <button type="button" onClick={open} className="w-full text-left">
          <div className="aspect-video bg-zinc-900 relative overflow-hidden rounded-xl">
            {thumb ? (
              <img src={thumb} alt="" className="h-full w-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-zinc-600 text-xs">No thumb</div>
            )}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
              <span className="h-12 w-12 rounded-full bg-black/70 flex items-center justify-center"><Play className="h-6 w-6 text-white ml-0.5" /></span>
            </div>
            {item.durationSec > 0 && (
              <span className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 text-[10px] text-white font-medium">
                {Math.floor(item.durationSec / 60)}:{String(Math.floor(item.durationSec % 60)).padStart(2, '0')}
              </span>
            )}
          </div>
          <div className="flex gap-3 pt-3">
            <div className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold shrink-0">
              {(item.creatorName || item.handle || '?')[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-zinc-100 line-clamp-2 leading-snug">{item.title || 'Untitled'}</p>
              <p className="text-xs text-zinc-500 mt-1">{handle}{subs > 0 ? ` · ${subs} subscribers` : ''}</p>
              <p className="text-xs text-zinc-500">{views} views</p>
              {item.soundTitle ? (
                <p className="text-xs text-zinc-500 mt-1 inline-flex items-center gap-1"><Music className="h-3 w-3" />{item.soundTitle}</p>
              ) : null}
              {item.description ? (
                <p className="text-xs text-zinc-600 mt-1 line-clamp-2">{item.description}</p>
              ) : null}
            </div>
          </div>
        </button>
        {actions}
        {showComments && <div className="px-3 pb-3"><CommentsPanel contentId={item.id} creatorId={item.creatorId || item.userId} /></div>}
        <ReportModal open={reportOpen} onClose={() => setReportOpen(false)} target={{ id: item.id, contentId: item.id, userId: item.creatorId || item.userId, handle: item.handle }} />
      </div>
    )
  }

  // YouTube Shorts-style vertical card
  return (
    <div className="group rounded-2xl border border-zinc-800 bg-[#121218] overflow-hidden hover:border-white/25 transition-all w-full">
      <button type="button" onClick={open} className="w-full text-left">
        <div className="aspect-[9/16] max-h-[420px] bg-zinc-900 relative overflow-hidden">
          {thumb ? (
            <img src={thumb} alt="" className="h-full w-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-zinc-600 text-xs">No thumb</div>
          )}
          <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/90 via-black/40 to-transparent">
            <p className="text-sm font-semibold text-white line-clamp-2">{item.title || 'Untitled'}</p>
            <p className="text-[11px] text-zinc-300 mt-1">{handle}</p>
            {item.soundTitle ? (
              <p className="text-[11px] text-zinc-300 mt-0.5 inline-flex items-center gap-1 truncate"><Music className="h-3 w-3 shrink-0" />{item.soundTitle}</p>
            ) : null}
          </div>
          <div className="absolute top-2 right-2 flex items-center gap-1 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] text-zinc-200">
            <Eye className="h-3 w-3" /> {views}
          </div>
        </div>
      </button>
      {actions}
      {showComments && <div className="px-3 pb-3"><CommentsPanel contentId={item.id} creatorId={item.creatorId || item.userId} /></div>}
      <ReportModal open={reportOpen} onClose={() => setReportOpen(false)} target={{ id: item.id, contentId: item.id, userId: item.creatorId || item.userId, handle: item.handle }} />
    </div>
  )
}
