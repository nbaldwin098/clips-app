import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { isSubscribed, toggleSubscribe } from '../lib/engagement'
import { resolvePublicCreator } from '../lib/contentService'
import { cn } from '../lib/utils'

export default function SubscribeButton({ creatorId, handle, onOpenAuth, className }) {
  const { user, isAuthenticated } = useAuth()
  const found = resolvePublicCreator(handle, creatorId)
  const resolvedId = creatorId || found?.id || (handle ? `h:${String(handle).replace(/^@/, '').toLowerCase()}` : null)
  const [on, setOn] = useState(() => isSubscribed(user?.id, resolvedId))

  useEffect(() => {
    setOn(isSubscribed(user?.id, resolvedId))
  }, [user?.id, resolvedId])

  if (!resolvedId || resolvedId === user?.id) return null

  return (
    <button
      type="button"
      onClick={() => {
        if (!isAuthenticated || !user?.id) {
          onOpenAuth?.()
          return
        }
        setOn(toggleSubscribe(user.id, resolvedId))
      }}
      className={cn(
        'h-9 px-4 rounded-full text-sm font-semibold shrink-0',
        on ? 'bg-[#272727] text-white hover:bg-[#3f3f3f]' : 'bg-white text-black hover:bg-zinc-200',
        className
      )}
    >
      {on ? 'Subscribed' : 'Subscribe'}
    </button>
  )
}
