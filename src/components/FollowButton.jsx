import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { isSubscribed, toggleSubscribe } from '../lib/engagement'
import { resolvePublicCreator } from '../lib/contentService'
import { cn } from '../lib/utils'

/** Free channel follow. Paid livestream memberships use Premium checkout, not this button. */
export default function FollowButton({ creatorId, handle, onOpenAuth, className }) {
  const { user, isAuthenticated } = useAuth()
  const resolvedId = creatorId || resolvePublicCreator(handle, creatorId)?.id || null
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
      {on ? 'Following' : 'Follow'}
    </button>
  )
}
