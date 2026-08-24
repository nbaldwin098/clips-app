import { useEffect, useState } from 'react'
import { Mail } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { dmAvailableFor, listConversations, subscribeToInbox } from '../lib/directMessages'

const POLL_MS = 15000

export default function MessagesButton({ onNavigate }) {
  const { user } = useAuth()
  const available = dmAvailableFor(user)
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    if (!available) {
      setUnread(0)
      return undefined
    }
    const refresh = async () => {
      const list = await listConversations(user)
      setUnread(list.filter((c) => c.unread).length)
    }
    refresh()
    const interval = setInterval(refresh, POLL_MS)
    let unsub = () => {}
    subscribeToInbox(user.id, refresh).then((fn) => { unsub = fn })
    return () => {
      clearInterval(interval)
      unsub()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [available, user?.id])

  if (!available) return null

  return (
    <button
      type="button"
      onClick={() => onNavigate?.('messages')}
      className="relative h-10 w-10 flex items-center justify-center rounded-full text-zinc-200 hover:bg-white/10 transition-colors"
      title="Messages"
    >
      <Mail className="h-5 w-5" />
      {unread > 0 && (
        <span className="absolute top-1.5 right-1.5 min-w-4 h-4 px-1 rounded-full bg-[#eb0400] text-white text-[10px] font-bold leading-4">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </button>
  )
}
