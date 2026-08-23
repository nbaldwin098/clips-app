import { useEffect, useState } from 'react'
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
  markAllNotificationsRead,
  markNotificationRead,
  subscribeNotifications,
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

export default function NotificationsPage({ onNavigate }) {
  const { user, isAuthenticated } = useAuth()
  const [items, setItems] = useState([])

  useEffect(() => {
    if (!user?.id) {
      setItems([])
      return undefined
    }
    const refresh = () => setItems(listNotifications(user.id))
    refresh()
    markAllNotificationsRead(user.id)
    refresh()
    return subscribeNotifications(refresh)
  }, [user?.id])

  if (!isAuthenticated) {
    return (
      <div className="p-4 md:p-6 max-w-2xl mx-auto">
        <h1 className="text-xl font-semibold text-zinc-100 mb-6">Notifications</h1>
        <div className="rounded-2xl border border-zinc-800 bg-[#121218] px-6 py-16 text-center">
          <p className="text-sm text-zinc-400">
          Sign in to see notifications.
        </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold text-zinc-100 mb-6">Notifications</h1>
      {items.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800/80 bg-[#121218] px-6 py-16 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-white/10 flex items-center justify-center">
            <Bell className="h-6 w-6 text-white" />
          </div>
          <p className="mt-4 text-sm font-medium text-zinc-200">No notifications</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((it) => {
            const Icon = ICONS[it.type] || Bell
            return (
              <button
                key={it.id}
                type="button"
                onClick={() => {
                  markNotificationRead(user.id, it.id)
                  if (it.view && onNavigate) onNavigate(it.view)
                }}
                className={cn(
                  'w-full text-left rounded-xl border px-4 py-3 transition-colors',
                  it.read
                    ? 'border-zinc-800 bg-[#121218]'
                    : 'border-white/20 bg-[#1a1a22]'
                )}
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 h-8 w-8 rounded-lg bg-white/10 text-white flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-zinc-100">{it.title}</p>
                    {it.body && <p className="text-xs text-zinc-500 mt-0.5 truncate">{it.body}</p>}
                    <p className="text-[10px] text-zinc-600 mt-1">{timeAgo(it.at)}</p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
