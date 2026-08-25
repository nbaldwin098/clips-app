import { useState, useRef, useEffect } from 'react'
import { Flag, Share2, Bookmark, Music, MoreVertical, Download } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getViews, getSubscriberCount } from '../lib/engagement'
import { recordInteraction } from '../lib/algorithmEngine'
import { toggleSaved, getSaved } from '../lib/storage'
import { notifyContentChanged } from '../lib/contentSync'
import { getWatchProgress } from '../lib/watchProgress'
import { copyShareUrl } from '../lib/routes'
import { hideBrokenMedia } from '../lib/catalogHealth'
import { openSafeUrl } from '../lib/safeUrl'
import ReportModal from './ReportModal'
import PostedStamp from './PostedStamp'
import ChannelAvatar from './ChannelAvatar'
import VerifiedBadge from './VerifiedBadge'
import { downloadPostedMedia } from '../lib/mediaDownload'
import {
  creatorDisplayName,
  subscribersLabel,
  formatDuration,
  viewsLabel,
} from '../lib/uiFormat'
import { isVerifiedChannel } from '../lib/verification'

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
    if (onOpen) onOpen(item)
    else if (item.sourceUrl) openSafeUrl(item.sourceUrl)
  }

  const handleShare = async (e) => {
    e.stopPropagation()
    setMenuOpen(false)
    try {
      await copyShareUrl(item.type === 'short' ? 'clips' : item.type === 'pic' ? 'pic' : 'watch', item.id)
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
  const name = creatorDisplayName(item)
  const official = isVerifiedChannel(item.creatorId || item.userId, item.handle)
  const handle = item.handle ? `@${String(item.handle).replace(/^@/, '')}` : ''
  const followLine = subscribersLabel(subs)

  const menu = (
    <div className="relative shrink-0" ref={menuRef}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v) }}
        className="h-8 w-8 rounded-full text-[#aaa] hover:bg-white/10 hover:text-white flex items-center justify-center"
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
          <button
            type="button"
            onClick={async (e) => {
              e.stopPropagation()
              setMenuOpen(false)
              await downloadPostedMedia(item)
            }}
            className="w-full px-3 py-2 text-left text-xs text-white hover:bg-white/10 inline-flex items-center gap-2"
          >
            <Download className="h-3.5 w-3.5" /> Download
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
          <div className="relative aspect-video w-full bg-[#272727] overflow-hidden rounded-xl">
            {thumb ? (
              <img
                src={thumb}
                alt=""
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={drop}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-zinc-600 text-xs">No thumb</div>
            )}
            {item.durationSec > 0 && (
              <span className="absolute bottom-1.5 right-1.5 rounded px-1 py-0.5 text-[11px] text-white font-medium bg-black/80">
                {formatDuration(item.durationSec)}
              </span>
            )}
            {Number(item.priceUsd) > 0 && (
              <span className="absolute top-1.5 left-1.5 rounded px-1.5 py-0.5 text-[10px] font-semibold text-black bg-white">
                ${Number(item.priceUsd).toFixed(2)}
              </span>
            )}
            {resumeRatio > 0.05 && (
              <div className="absolute bottom-0 inset-x-0 h-[3px] bg-black/50">
                <div className="h-full bg-[#eb0400]" style={{ width: `${Math.round(resumeRatio * 100)}%` }} />
              </div>
            )}
          </div>
        </button>
        <div className="flex gap-3 pt-3">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); window.__clipsOpenProfile?.(item.handle, item.creatorId || item.userId) }}
            className="shrink-0 mt-0.5"
          >
            <ChannelAvatar src={item.avatarUrl} name={name} size={36} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-zinc-100 line-clamp-2 leading-snug cursor-pointer" onClick={open}>{item.title || 'Untitled'}</p>
            <p className="text-xs text-[#aaa] mt-1 inline-flex items-center gap-1 min-w-0">
              <button type="button" onClick={(e) => { e.stopPropagation(); window.__clipsOpenProfile?.(item.handle, item.creatorId || item.userId) }} className="hover:text-white truncate">
                {name}
              </button>
              {official ? <VerifiedBadge /> : null}
            </p>
            <p className="text-xs text-[#aaa]">
              {viewsLabel(views)}
              {item.createdAt || item.publishedAt ? <> · <PostedStamp item={item} /></> : ''}
              {followLine ? ` · ${followLine}` : ''}
            </p>
            {item.soundTitle ? (
              <button type="button" onClick={(e) => { e.stopPropagation(); window.__clipsOpenSound?.(item.soundId || item.soundTitle) }} className="text-xs text-[#aaa] mt-1 inline-flex items-center gap-1 hover:text-white">
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
        <div className="relative aspect-[9/16] w-full bg-[#272727] overflow-hidden rounded-xl">
          {thumb ? (
            <img
              src={thumb}
              alt=""
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={drop}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-zinc-600 text-xs">No thumb</div>
          )}
          <div className="absolute inset-x-0 bottom-0 pt-10 pb-2 px-2 bg-gradient-to-t from-black/80 to-transparent">
            <p className="text-[13px] font-medium text-white leading-snug line-clamp-2">{item.title || 'Untitled'}</p>
          </div>
          {item.durationSec > 0 && (
            <span className="absolute top-2 right-2 rounded px-1 py-0.5 text-[10px] text-white font-medium bg-black/80">
              {formatDuration(item.durationSec)}
            </span>
          )}
          {Number(item.priceUsd) > 0 && (
            <span className="absolute top-2 left-2 rounded px-1.5 py-0.5 text-[10px] font-semibold text-black bg-white">
              ${Number(item.priceUsd).toFixed(2)}
            </span>
          )}
          {resumeRatio > 0.05 && (
            <div className="absolute bottom-0 inset-x-0 h-[3px] bg-black/50">
              <div className="h-full bg-[#eb0400]" style={{ width: `${Math.round(resumeRatio * 100)}%` }} />
            </div>
          )}
        </div>
      </button>
      <div className="pt-2 flex gap-1">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-[#aaa] mt-0.5 inline-flex items-center gap-1">
            <button type="button" onClick={(e) => { e.stopPropagation(); window.__clipsOpenProfile?.(item.handle, item.creatorId || item.userId) }} className="hover:text-white truncate">{handle || name}</button>
            {' · '}{viewsLabel(views)}
            {item.createdAt || item.publishedAt ? <> · <PostedStamp item={item} /></> : ''}
          </p>
        </div>
        {menu}
      </div>
      <ReportModal open={reportOpen} onClose={() => setReportOpen(false)} target={{ id: item.id, contentId: item.id, userId: item.creatorId || item.userId, handle: item.handle }} />
    </div>
  )
}
