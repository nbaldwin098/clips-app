import { useState, useRef, useEffect } from 'react'
import { Flag, Share2, Bookmark, Play, Music, MoreVertical } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getViews, recordView, getSubscriberCount } from '../lib/engagement'
import { recordInteraction } from '../lib/algorithmEngine'
import { toggleSaved, getSaved } from '../lib/storage'
import { notifyContentChanged } from '../lib/contentSync'
import { getWatchProgress } from '../lib/watchProgress'
import { copyShareUrl } from '../lib/routes'
import { hideBrokenMedia } from '../lib/catalogHealth'
import { openSafeUrl } from '../lib/safeUrl'
import ReportModal from './ReportModal'
import PostedStamp from './PostedStamp'

/** video = YouTube row card; short = Shorts-style vertical */
export default function ContentCard({ item, onOpen, variant }) {
  const { user } = useAuth()
  const [views, setViews] = useState(() => getViews(item?.id))
  const [isSaved, setIsSaved] = useState(() => (getSaved() || []).includes(item?.id))
  const [copied, setCopied] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [gone, setGone] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const progress = user?.id ? getWatchProgress(user.id, item?.id) : null
  const resumeRatio = progress && !progress.completed ? (progress.lastRatio || progress.watchRatio || 0) : 0
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

  useEffect(() => {
    const onDoc = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  if (!item || gone) return null

  const drop = () => {
    hideBrokenMedia(item.id)
    setGone(true)
  }

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

  const handleShare = async (e) => {
    e.stopPropagation()
    setMenuOpen(false)
    try {
      await copyShareUrl('watch', item.id)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      if (user?.id) {
        recordInteraction(user.id, { contentId: item.id, type: 'share', tags: item.tags || [], creatorId: item.creatorId || item.userId })
      }
    } catch {}
  }

  const handleSave = (e) => {
    e.stopPropagation()
    setMenuOpen(false)
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

  const menu = (
    <div className="relative shrink-0" ref={menuRef}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v) }}
        className="h-8 w-8 rounded-full text-zinc-400 hover:bg-white/10 hover:text-white flex items-center justify-center"
        aria-label="More"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {menuOpen ? (
        <div className="absolute right-0 top-9 z-30 min-w-[10rem] rounded-xl border border-white/10 bg-[#212121] py-1 shadow-xl">
          <button type="button" onClick={handleShare} className="w-full px-3 py-2 text-left text-xs text-white hover:bg-white/10 inline-flex items-center gap-2">
            <Share2 className="h-3.5 w-3.5" /> {copied ? 'Copied' : 'Share'}
          </button>
          <button type="button" onClick={handleSave} className="w-full px-3 py-2 text-left text-xs text-white hover:bg-white/10 inline-flex items-center gap-2">
            <Bookmark className={`h-3.5 w-3.5 ${isSaved ? 'fill-current' : ''}`} /> {isSaved ? 'Saved' : 'Save'}
          </button>
          <button type="button" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); setReportOpen(true) }} className="w-full px-3 py-2 text-left text-xs text-white hover:bg-white/10 inline-flex items-center gap-2">
            <Flag className="h-3.5 w-3.5" /> Report
          </button>
        </div>
      ) : null}
    </div>
  )

  if (mode === 'video') {
    return (
      <div className="group w-full">
        <button type="button" onClick={open} className="w-full text-left">
          <div className="relative aspect-video w-full bg-zinc-900 overflow-hidden rounded-xl">
            {thumb ? (
              <img src={thumb} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" referrerPolicy="no-referrer" onError={drop} />
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
            {resumeRatio > 0.05 && (
              <div className="absolute bottom-0 inset-x-0 h-1 bg-black/50">
                <div className="h-full bg-white" style={{ width: `${Math.round(resumeRatio * 100)}%` }} />
              </div>
            )}
          </div>
        </button>
        <div className="flex gap-3 pt-3">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); window.__clipsOpenProfile?.(item.handle, item.creatorId || item.userId) }}
            className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold shrink-0"
          >
            {(item.creatorName || item.handle || '?')[0]?.toUpperCase()}
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-zinc-100 line-clamp-2 leading-snug cursor-pointer" onClick={open}>{item.title || 'Untitled'}</p>
            <p className="text-xs text-zinc-500 mt-1">
              <button type="button" onClick={(e) => { e.stopPropagation(); window.__clipsOpenProfile?.(item.handle, item.creatorId || item.userId) }} className="hover:text-white">
                {handle}
              </button>
              {subs > 0 ? ` · ${subs} followers` : ''}
            </p>
            <p className="text-xs text-zinc-500">{views} views{item.createdAt || item.publishedAt ? <> · <PostedStamp item={item} /></> : ''}</p>
            {item.soundTitle ? (
              <button type="button" onClick={(e) => { e.stopPropagation(); window.__clipsOpenSound?.(item.soundId || item.soundTitle) }} className="text-xs text-zinc-500 mt-1 inline-flex items-center gap-1 hover:text-white">
                <Music className="h-3 w-3" />{item.soundTitle}
              </button>
            ) : null}
          </div>
          {menu}
        </div>
        <ReportModal open={reportOpen} onClose={() => setReportOpen(false)} target={{ id: item.id, contentId: item.id, userId: item.creatorId || item.userId, handle: item.handle }} />
      </div>
    )
  }

  return (
    <div className="group w-full">
      <button type="button" onClick={open} className="w-full text-left">
        <div className="relative aspect-[9/16] w-full bg-zinc-900 overflow-hidden rounded-xl">
          {thumb ? (
            <img src={thumb} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" referrerPolicy="no-referrer" onError={drop} />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-zinc-600 text-xs">No thumb</div>
          )}
          {item.durationSec > 0 && (
            <span className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 text-[10px] text-white font-medium">
              {Math.floor(item.durationSec / 60)}:{String(Math.floor(item.durationSec % 60)).padStart(2, '0')}
            </span>
          )}
          {resumeRatio > 0.05 && (
            <div className="absolute bottom-0 inset-x-0 h-1 bg-black/50">
              <div className="h-full bg-white" style={{ width: `${Math.round(resumeRatio * 100)}%` }} />
            </div>
          )}
        </div>
      </button>
      <div className="pt-2 flex gap-1">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-zinc-100 line-clamp-2 leading-snug cursor-pointer" onClick={open}>{item.title || 'Untitled'}</p>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            <button type="button" onClick={(e) => { e.stopPropagation(); window.__clipsOpenProfile?.(item.handle, item.creatorId || item.userId) }} className="hover:text-white">{handle}</button>
            {' · '}{views} views{item.createdAt || item.publishedAt ? <> · <PostedStamp item={item} /></> : ''}
          </p>
        </div>
        {menu}
      </div>
      <ReportModal open={reportOpen} onClose={() => setReportOpen(false)} target={{ id: item.id, contentId: item.id, userId: item.creatorId || item.userId, handle: item.handle }} />
    </div>
  )
}
