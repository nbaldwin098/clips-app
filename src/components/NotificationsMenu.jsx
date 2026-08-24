import { useEffect, useRef, useState } from 'react'
import {
  Bell,
  Heart,
  MessageCircle,
  Radio,
  UserPlus,
  AtSign,
  Crown,
  ShieldCheck,
  Flag,
  Clapperboard,
  Megaphone,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
  listNotifications,
  markNotificationRead,
  subscribeNotifications,
  unreadCount,
} from '../lib/notifications'
import { cn } from '../lib/utils'

const ICONS = {
  subscriber: UserPlus,
  like: Heart,
  comment: MessageCircle,
  mention: AtSign,
  live: Radio,
  post: Megaphone,
  upload: Clapperboard,
  premium: Crown,
  application: ShieldCheck,
  verification: ShieldCheck,
  report: Flag,
  ticket: Flag,
  held_comment: MessageCircle,
}

function timeAgo(iso) {
  if (!iso) return ''
  const ms = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(ms) || ms < 0) return ''
  const mins = Math.floor(ms / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export default function NotificationsMenu({ onNavigate, onOpenWatch, onOpenAuth }) {
  const { user, isAuthenticated } = useAuth()
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const [preview, setPreview] = useState([])
  const wrapRef = useRef(null)

  useEffect(() => {
    if (!user?.id) {
      setUnread(0)
      setPreview([])
      return undefined
    }
    const refresh = () => {
      setUnread(unreadCount(user.id))
      setPreview(listNotifications(user.id).slice(0, 5))
    }
    refresh()
    return subscribeNotifications(refresh)
  }, [user?.id])

  useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const goFull = () => {
    setOpen(false)
    onNavigate?.('notifications')
  }

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => {
          if (!isAuthenticated) {
            onOpenAuth?.()
            return
          }
          setOpen((v) => !v)
        }}
        className="relative h-10 w-10 flex items-center justify-center rounded-full text-zinc-200 hover:bg-white/10 transition-colors"
        title="Notifications"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-4 h-4 px-1 rounded-full bg-[#eb0400] text-white text-[10px] font-bold leading-4">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && isAuthenticated && (
        <div className="absolute right-0 mt-2 w-[22rem] max-w-[calc(100vw-1.5rem)] rounded-xl border border-[#2d2d38] bg-[#14141b] shadow-2xl z-50 overflow-hidden">
          <div className="px-3.5 py-2.5 border-b border-[#23232d] flex items-center justify-between">
            <p className="text-sm font-semibold text-white">Notifications</p>
            {unread > 0 ? (
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{unread} new</span>
            ) : null}
          </div>
          {preview.length === 0 ? (
            <p className="px-4 py-8 text-center text-xs text-zinc-500">You are all caught up.</p>
          ) : (
            <div className="max-h-[22rem] overflow-y-auto py-1">
              {preview.map((it) => {
                const Icon = ICONS[it.type] || Bell
                return (
                  <button
                    key={it.id}
                    type="button"
                    onClick={() => {
                      markNotificationRead(user.id, it.id)
                      setOpen(false)
                      if (it.contentId && onOpenWatch) onOpenWatch(it.contentId)
                      else if (it.view && onNavigate) onNavigate(it.view)
                      else onNavigate?.('notifications')
                    }}
                    className={cn(
                      'w-full text-left px-3.5 py-2.5 hover:bg-[#1f1f2a] flex items-start gap-2.5',
                      !it.read && 'bg-white/[0.03]'
                    )}
                  >
                    <span className="mt-0.5 h-8 w-8 rounded-lg bg-white/10 text-white flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs text-zinc-100 line-clamp-2">{it.title}</span>
                      {it.body ? <span className="block text-[11px] text-zinc-500 mt-0.5 truncate">{it.body}</span> : null}
                      <span className="block text-[10px] text-zinc-600 mt-1">{timeAgo(it.at)}</span>
                    </span>
                    {!it.read ? <span className="mt-2 h-1.5 w-1.5 rounded-full bg-white shrink-0" /> : null}
                  </button>
                )
              })}
            </div>
          )}
          <button
            type="button"
            onClick={goFull}
            className="w-full border-t border-[#23232d] px-3.5 py-2.5 text-xs font-semibold text-white hover:bg-[#1f1f2a]"
          >
            Show more
          </button>
        </div>
      )}
    </div>
  )
}
