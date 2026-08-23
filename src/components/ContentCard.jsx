import { useState, useRef, useEffect } from 'react'
import { ThumbsUp, ThumbsDown, Eye, MessageCircle, Flag, Share2, Bookmark } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
  getVotes, getUserVote, toggleVote, getViews, recordView, getSubscriberCount,
} from '../lib/engagement'
import { recordInteraction } from '../lib/algorithmEngine'
import { toggleSaved, getSaved } from '../lib/storage'
import { cn } from '../lib/utils'
import CommentsPanel from './CommentsPanel'
import ReportModal from './ReportModal'

export default function ContentCard({ item, onOpen }) {
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

  useEffect(() => {
    viewStartTime.current = Date.now()
    const tags = item?.tags || []
    const cid = item?.creatorId || item?.userId
    const itemId = item?.id
    const uid = user?.id

    return () => {
      // If unmounted quickly (< 1.8s), record an early skip for algorithmic learning
      if (viewStartTime.current) {
        const durationMs = Date.now() - viewStartTime.current
        if (uid && itemId && durationMs < 1800) {
          recordInteraction(uid, {
            contentId: itemId,
            type: 'early_skip',
            tags,
            creatorId: cid,
          })
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
        recordInteraction(user.id, {
          contentId: item.id,
          type: 'share',
          tags: item.tags || [],
          creatorId: item.creatorId || item.userId,
        })
      }
    } catch {}
  }

  const handleSave = (e) => {
    e.stopPropagation()
    const next = toggleSaved(item.id)
    const savedNow = next.includes(item.id)
    setIsSaved(savedNow)
    if (user?.id && savedNow) {
      recordInteraction(user.id, {
        contentId: item.id,
        type: 'save',
        tags: item.tags || [],
        creatorId: item.creatorId || item.userId,
      })
    }
  }

  const thumb = item.thumbUrl || item.mediaUrl
  const subs = item.creatorId ? getSubscriberCount(item.creatorId) : 0

  return (
    <div className="group rounded-2xl border border-zinc-800 bg-[#121218] overflow-hidden hover:border-white/35 transition-all card-lift w-full">
      <button type="button" onClick={open} className="w-full text-left">
        <div className="aspect-[9/14] max-h-64 bg-zinc-900 relative overflow-hidden">
          {thumb ? (
            <img src={thumb} alt="" className="h-full w-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-zinc-600 text-xs">No thumb</div>
          )}
          <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] text-zinc-200">
            <Eye className="h-3 w-3" /> {views}
          </div>
        </div>
        <div className="p-3">
          <p className="text-sm font-medium text-zinc-100 line-clamp-2">{item.title || 'Untitled'}</p>
          <p className="text-xs text-zinc-500 mt-1">
            {item.creatorName || item.handle || 'Creator'}
            {subs > 0 && <span> · {subs} subs</span>}
          </p>
        </div>
      </button>
      <div className="px-3 pb-3 flex items-center gap-1.5 sm:gap-2 flex-wrap">
        <button type="button" onClick={(e) => vote('up', e)} className={cn('inline-flex items-center gap-1 h-8 px-2.5 rounded-full border text-xs transition-transform', myVote === 'up' ? 'border-white text-white bg-white/10' : 'border-zinc-800 text-zinc-400', pulse === 'up' && 'scale-125')} title="Like">
          <ThumbsUp className={cn('h-3.5 w-3.5', pulse === 'up' && 'animate-bounce')} />
          {votes.up}
        </button>
        <button type="button" onClick={(e) => vote('down', e)} className={cn('inline-flex items-center gap-1 h-8 px-2 rounded-full border text-xs transition-transform', myVote === 'down' ? 'border-red-400 text-red-400 bg-red-400/10' : 'border-zinc-800 text-zinc-400', pulse === 'down' && 'scale-125')} title="Dislike">
          <ThumbsDown className={cn('h-3.5 w-3.5', pulse === 'down' && 'animate-bounce')} />
          {votes.down}
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setShowComments((v) => !v) }}
          className="inline-flex items-center gap-1 h-8 px-2.5 rounded-full border border-zinc-800 text-zinc-400 text-xs hover:text-white"
          title="Comments"
        >
          <MessageCircle className="h-3.5 w-3.5" />
          Comment
        </button>
        <button
          type="button"
          onClick={handleSave}
          className={cn('inline-flex items-center gap-1 h-8 px-2.5 rounded-full border text-xs transition-colors', isSaved ? 'border-white text-white bg-white/10' : 'border-zinc-800 text-zinc-400 hover:text-white')}
          title="Bookmark / Save"
        >
          <Bookmark className={cn('h-3.5 w-3.5', isSaved && 'fill-current text-white')} />
        </button>
        <button
          type="button"
          onClick={handleShare}
          className="inline-flex items-center gap-1 h-8 px-2.5 rounded-full border border-zinc-800 text-zinc-400 text-xs hover:text-white"
          title={copied ? 'Link copied!' : 'Share'}
        >
          <Share2 className="h-3.5 w-3.5" />
          {copied && <span className="text-[10px] text-white">Copied</span>}
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setReportOpen(true) }}
          className="inline-flex items-center gap-1 h-8 px-2 rounded-full border border-zinc-800 text-zinc-400 text-xs hover:text-white ml-auto"
          title="Report"
        >
          <Flag className="h-3.5 w-3.5" />
        </button>
      </div>
      {showComments && (
        <div className="px-3 pb-3">
          <CommentsPanel contentId={item.id} creatorId={item.creatorId || item.userId} />
        </div>
      )}
      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        target={{ id: item.id, contentId: item.id, userId: item.creatorId || item.userId, handle: item.handle }}
      />
    </div>
  )
}
