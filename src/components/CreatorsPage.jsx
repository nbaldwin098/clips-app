import { useEffect, useState } from 'react'
import { Users } from 'lucide-react'
import { listSidebarCreators } from '../lib/contentService'
import { useContentSyncTick } from '../lib/useContentSync'
import ChannelAvatar from './ChannelAvatar'
import VerifiedBadge from './VerifiedBadge'
import { isOfficialCreator } from '../lib/uiFormat'
import { isVerifiedChannel } from '../lib/verification'

export default function CreatorsPage() {
  const syncTick = useContentSyncTick()
  const [ranked, setRanked] = useState(() => listSidebarCreators(24))

  useEffect(() => {
    const next = listSidebarCreators(24)
    if (next.length) setRanked(next)
  }, [syncTick])

  return (
    <div className="p-4 md:p-6 max-w-[720px] mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Following</h1>
      {ranked.length === 0 ? (
        <div className="rounded-2xl border border-[#272727] bg-[#0f0f0f] px-6 py-16 text-center">
          <Users className="h-8 w-8 text-white mx-auto" />
          <p className="mt-4 text-sm text-zinc-200">No one has posted yet</p>
        </div>
      ) : (
        <div className="divide-y divide-[#272727] rounded-2xl border border-[#272727] overflow-hidden">
          {ranked.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => { if (typeof window !== 'undefined') window.__clipsOpenProfile?.(c.handle, c.id) }}
              className="w-full flex items-center gap-4 px-4 py-3 text-left hover:bg-[#181818]"
            >
              <ChannelAvatar src={c.avatarUrl} name={c.displayName} size={48} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate inline-flex items-center gap-1.5">
                  {c.displayName}
                  {isVerifiedChannel(c.id, c.handle) ? <VerifiedBadge title={isOfficialCreator(c.id, c.handle) ? 'Official channel' : 'Verified'} /> : null}
                </p>
                <p className="text-xs text-[#aaa]">
                  @{c.handle || 'creator'}
                  {c.postCount ? ` · ${c.postCount} post${c.postCount === 1 ? '' : 's'}` : ''}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
