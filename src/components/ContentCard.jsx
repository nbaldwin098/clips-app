import { useState, useRef, useEffect } from 'react'
import { ThumbsUp, ThumbsDown, MessageCircle, Flag, Share2, Bookmark, Play, Music } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
  getVotes, getUserVote, toggleVote, getViews, recordView, getSubscriberCount,
} from '../lib/engagement'
import { recordInteraction } from '../lib/algorithmEngine'
import { toggleSaved, getSaved } from '../lib/storage'
import { notifyContentChanged } from '../lib/contentSync'
import { cn } from '../lib/utils'
import { openSafeUrl } from '../lib/safeUrl'
import CommentsPanel from './CommentsPanel'
import ReportModal from './ReportModal'

/** video = YouTube row card; short = Shorts-style vertical */
export default function ContentCard({ item, onOpen, variant }) {
  const { user, isAuthenticated } = useAuth()
  const [, setVotes] = useState(() => getVotes(item?.id))
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
    else if (item.sourceUrl) openSafeUrl(item.sourceUrl)
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
    notifyContentChanged()
    if (user?.id && savedNow) {
      recordInteraction(user.id, { contentId: item.id, type: 'save', tags: item.tags || [], creatorId: item.creatorId || item.userId })
    }
  }

  const thumb = item.thumbUrl || item.mediaUrl
  const subs = item.creatorId ? getSubscriberCount(item.creatorId) : 0
  const handle = item.handle ? `@${String(item.handle).replace(/^@/, '')}` : 'Creator'

  const actions = (
    <div className="px-2 pb-2 flex items-center gap-1 flex-nowrap">
      <button type="button" onClick={(e) => vote('up', e)} className={cn('inline-flex items-center justify-center h-8 min-w-8 px-2 rounded-full border text-xs shrink-0', myVote === 'up' ? 'border-white text-white bg-white/10' : 'border-zinc-800 text-zinc-400', pulse === 'up' && 'scale-125')}>
        <ThumbsUp className="h-3.5 w-3.5" />
      </button>
      <button type="button" onClick={(e) => vote('down', e)} className={cn('inline-flex items-center justify-center h-8 min-w-8 px-2 rounded-full border text-xs shrink-0', myVote === 'down' ? 'border-red-400 text-red-400' : 'border-zinc-800 text-zinc-400')}>
        <ThumbsDown className="h-3.5 w-3.5" />
      </button>
      <button type="button" onClick={(e) => { e.stopPropagation(); setShowComments((v) => !v) }} className="inline-flex items-center justify-center h-8 w-8 rounded-full border border-zinc-800 text-zinc-400 shrink-0">
        <MessageCircle className="h-3.5 w-3.5" />
      </button>
      <button type="button" onClick={handleSave} className={cn('inline-flex items-center justify-center h-8 w-8 rounded-full border shrink-0', isSaved ? 'border-white text-white' : 'border-zinc-800 text-zinc-400')}>
        <Bookmark className={cn('h-3.5 w-3.5', isSaved && 'fill-current')} />
      </button>
      <button type="button" onClick={handleShare} className="inline-flex items-center justify-center h-8 w-8 rounded-full border border-zinc-800 text-zinc-400 shrink-0" title={copied ? 'Copied' : 'Share'}>
        <Share2 className="h-3.5 w-3.5" />
      </button>
      <button type="button" onClick={(e) => { e.stopPropagation(); setReportOpen(true) }} className="inline-flex items-center justify-center h-8 w-8 rounded-full border border-zinc-800 text-zinc-400 shrink-0 ml-auto">
        <Flag className="h-3.5 w-3.5" />
      </button>
    </div>
  )

  // YouTube-style horizontal video card
  if (mode === 'video') {
    return (
      <div className="group rounded-xl overflow-hidden w-full">
        <button type="button" onClick={open} className="w-full text-left">
          <div className="relative aspect-video w-full bg-zinc-900 overflow-hidden rounded-xl">
            {thumb ? (
              <img src={thumb} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-zinc-600 text-xs">No thumb</div>
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
            </div>
          </div>
        </button>
        {actions}
        {showComments && <div className="px-3 pb-3"><CommentsPanel contentId={item.id} creatorId={item.creatorId || item.userId} /></div>}
        <ReportModal open={reportOpen} onClose={() => setReportOpen(false)} target={{ id: item.id, contentId: item.id, userId: item.creatorId || item.userId, handle: item.handle }} />
      </div>
    )
  }

  return (
    <div className="group w-full">
      <button type="button" onClick={open} className="w-full text-left">
        <div className="relative aspect-[9/16] w-full bg-zinc-900 overflow-hidden rounded-xl">
          {thumb ? (
            <img src={thumb} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-zinc-600 text-xs">No thumb</div>
          )}
          {item.durationSec > 0 && (
            <span className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 text-[10px] text-white font-medium">
              {Math.floor(item.durationSec / 60)}:{String(Math.floor(item.durationSec % 60)).padStart(2, '0')}
            </span>
          )}
        </div>
        <div className="pt-2 px-0.5">
          <p className="text-xs font-semibold text-zinc-100 line-clamp-2 leading-snug">{item.title || 'Untitled'}</p>
          <p className="text-[11px] text-zinc-500 mt-0.5">{handle} · {views} views</p>
          {item.soundTitle ? (
            <p className="text-[11px] text-zinc-500 mt-0.5 inline-flex items-center gap-1"><Music className="h-3 w-3" />{item.soundTitle}</p>
          ) : null}
        </div>
      </button>
      {actions}
      {showComments && <div className="px-3 pb-3"><CommentsPanel contentId={item.id} creatorId={item.creatorId || item.userId} /></div>}
      <ReportModal open={reportOpen} onClose={() => setReportOpen(false)} target={{ id: item.id, contentId: item.id, userId: item.creatorId || item.userId, handle: item.handle }} />
    </div>
  )
}
