import { useState } from 'react'
import { ThumbsUp, ThumbsDown, Eye } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
  getVotes, getUserVote, toggleVote, getViews, recordView, getSubscriberCount,
} from '../lib/engagement'
import { cn } from '../lib/utils'

export default function ContentCard({ item, onOpen }) {
  const { user, isAuthenticated } = useAuth()
  const [votes, setVotes] = useState(() => getVotes(item?.id))
  const [myVote, setMyVote] = useState(() => getUserVote(user?.id, item?.id))
  const [views, setViews] = useState(() => getViews(item?.id))
  const [pulse, setPulse] = useState(null)

  if (!item) return null

  const open = () => {
    const n = recordView(item.id)
    setViews(n)
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
  }

  const thumb = item.thumbUrl || item.mediaUrl
  const subs = item.creatorId ? getSubscriberCount(item.creatorId) : 0

  return (
    <div className="group rounded-2xl border border-zinc-800 bg-[#121218] overflow-hidden hover:border-[#007acc]/35 transition-all card-lift w-full">
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
      <div className="px-3 pb-3 flex items-center gap-2">
        <button type="button" onClick={(e) => vote('up', e)} className={cn('inline-flex items-center gap-1 h-8 px-2.5 rounded-full border text-xs transition-transform', myVote === 'up' ? 'border-[#007ACC] text-[#007ACC] bg-[#007ACC]/10' : 'border-zinc-800 text-zinc-400', pulse === 'up' && 'scale-125')}>
          <ThumbsUp className={cn('h-3.5 w-3.5', pulse === 'up' && 'animate-bounce')} />
          {votes.up}
        </button>
        <button type="button" onClick={(e) => vote('down', e)} className={cn('inline-flex items-center gap-1 h-8 px-2.5 rounded-full border text-xs transition-transform', myVote === 'down' ? 'border-red-400 text-red-400 bg-red-400/10' : 'border-zinc-800 text-zinc-400', pulse === 'down' && 'scale-125')}>
          <ThumbsDown className={cn('h-3.5 w-3.5', pulse === 'down' && 'animate-bounce')} />
          {votes.down}
        </button>
      </div>
    </div>
  )
}
