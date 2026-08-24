import { useMemo, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getHomeFeed, getFollowingFeed, getById } from '../lib/contentService'
import { listContinueWatching } from '../lib/watchProgress'
import { useContentSyncTick } from '../lib/useContentSync'
import { hasPickedTopics } from '../lib/tasteOnboarding'
import { getActivePromotion, recordPromoClick } from '../lib/promotions'
import MediaShelves from './MediaShelves'
import ContentCard from './ContentCard'
import TastePicker from './TastePicker'

export default function HomeFeed({ onPlayItem, onOpenPic, onNavigate }) {
  const { user } = useAuth()
  const syncTick = useContentSyncTick()
  const [picked, setPicked] = useState(() => hasPickedTopics())
  const items = useMemo(() => getHomeFeed(user?.id || null), [user?.id, syncTick, picked])
  const following = useMemo(() => getFollowingFeed(user?.id || null), [user?.id, syncTick])
  const promo = useMemo(() => getActivePromotion(), [syncTick])
  const featured = useMemo(() => {
    const id = promo?.featureContentId || (promo?.destView === 'watch' ? promo.destId : '')
    return id ? getById(id) : null
  }, [promo, syncTick])
  const continueItems = useMemo(() => {
    if (!user?.id) return []
    return listContinueWatching(user.id).map((row) => getById(row.contentId)).filter((i) => i && i.type === 'video')
  }, [user?.id, syncTick])

  return (
    <div className="p-4 md:p-8 max-w-[1280px] mx-auto w-full space-y-8">
      <h1 className="text-xl font-semibold text-zinc-100">Recommended</h1>

      {!picked && <TastePicker userId={user?.id} onDone={() => setPicked(true)} />}

      {promo && promo.placement === 'home' && (
        <button
          type="button"
          onClick={() => {
            recordPromoClick(promo.id)
            if (featured) onPlayItem?.(featured)
            else onNavigate?.(promo.destView || 'home', promo.destId || '')
          }}
          className="w-full text-left rounded-2xl border border-zinc-800 bg-[#121218] p-4"
        >
          <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Featured</p>
          <p className="text-sm font-semibold text-white mt-1">{promo.headline}</p>
          {promo.body ? <p className="text-xs text-zinc-400 mt-1">{promo.body}</p> : null}
        </button>
      )}

      {featured && (
        <section>
          <h2 className="text-base font-semibold text-zinc-200 mb-3">Featured</h2>
          <div className="max-w-md">
            <ContentCard item={featured} onOpen={onPlayItem} variant={featured.type === 'short' ? 'short' : 'video'} />
          </div>
        </section>
      )}

      {continueItems.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-zinc-200 mb-3">Continue watching</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {continueItems.slice(0, 6).map((item) => (
              <ContentCard key={item.id} item={item} onOpen={onPlayItem} variant={item.type === 'short' ? 'short' : 'video'} />
            ))}
          </div>
        </section>
      )}

      {following.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-zinc-200 mb-3">Following</h2>
          <MediaShelves items={following.slice(0, 12)} onPlayItem={onPlayItem} onOpenPic={onOpenPic} />
        </section>
      )}

      {items.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-[#121218] px-6 py-16 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-white/15 flex items-center justify-center">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <p className="mt-4 text-sm font-medium text-zinc-200">No posts yet</p>
        </div>
      ) : (
        <MediaShelves items={items} onPlayItem={onPlayItem} onOpenPic={onOpenPic} />
      )}
    </div>
  )
}
