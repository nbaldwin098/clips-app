import { useMemo, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getStableHomeFeed, getStableFollowingFeed, getById } from '../lib/contentService'
import { listContinueWatching } from '../lib/watchProgress'
import { hasPickedTopics } from '../lib/tasteOnboarding'
import { getActivePromotion, recordPromoClick } from '../lib/promotions'
import MediaShelves from './MediaShelves'
import ContentCard from './ContentCard'
import TastePicker from './TastePicker'
import Footer from './Footer'
import FilterChips from './FilterChips'
import HourlyHitsCarousel from './HourlyHitsCarousel'

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'video', label: 'Videos' },
  { id: 'clip', label: 'Clips' },
  { id: 'pic', label: 'Pics' },
]

export default function HomeFeed({ onPlayItem, onOpenPic, onNavigate }) {
  const { user } = useAuth()
  const [picked, setPicked] = useState(() => hasPickedTopics())
  const [filter, setFilter] = useState('all')
  const items = useMemo(() => getStableHomeFeed(user?.id || null), [user?.id, picked])
  const following = useMemo(() => getStableFollowingFeed(user?.id || null), [user?.id])
  const promo = useMemo(() => getActivePromotion(), [])
  const featured = useMemo(() => {
    const id = promo?.featureContentId || (promo?.destView === 'watch' ? promo.destId : '')
    return id ? getById(id) : null
  }, [promo])
  const continueItems = useMemo(() => {
    if (!user?.id) return []
    return listContinueWatching(user.id).map((row) => getById(row.contentId)).filter((i) => i && i.type === 'video')
  }, [user?.id])

  return (
    <div className="w-full">
      <HourlyHitsCarousel onPlayItem={onPlayItem} onOpenPic={onOpenPic} />
      <div className="px-4 md:px-6 py-4 max-w-[1600px] mx-auto w-full space-y-6">
      <FilterChips value={filter} onChange={setFilter} options={FILTERS} />

      {!picked && <TastePicker userId={user?.id} onDone={() => setPicked(true)} />}

      {promo && promo.placement === 'home' && (
        <button
          type="button"
          onClick={() => {
            recordPromoClick(promo.id)
            if (featured) onPlayItem?.(featured)
            else onNavigate?.(promo.destView || 'home', promo.destId || '')
          }}
          className="relative w-full text-left overflow-hidden rounded-2xl min-h-[120px] border border-[#272727]"
        >
          {featured?.thumbUrl ? (
            <img src={featured.thumbUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-r from-[#1a1a1a] to-[#2a2a2a]" />
          )}
          <div className="relative p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Featured</p>
            <p className="text-lg font-semibold text-white mt-1">{promo.headline}</p>
            {promo.body ? <p className="text-sm text-zinc-300 mt-1 max-w-xl">{promo.body}</p> : null}
          </div>
        </button>
      )}

      {featured && filter === 'all' && (
        <section>
          <h2 className="text-lg font-semibold text-white mb-4">Featured</h2>
          <div className="max-w-md">
            <ContentCard item={featured} onOpen={onPlayItem} variant={featured.type === 'short' ? 'short' : 'video'} />
          </div>
        </section>
      )}

      {continueItems.length > 0 && filter !== 'pic' && (
        <section>
          <h2 className="text-lg font-semibold text-white mb-4">Continue watching</h2>
          <div className="flex gap-4 overflow-x-auto pb-2 chip-scroll">
            {continueItems.slice(0, 8).map((item) => (
              <div key={item.id} className="w-[260px] sm:w-[280px] shrink-0">
                <ContentCard item={item} onOpen={onPlayItem} variant="video" />
              </div>
            ))}
          </div>
        </section>
      )}

      {following.length > 0 && filter === 'all' && (
        <section>
          <h2 className="text-lg font-semibold text-white mb-4">Subscribed</h2>
          <MediaShelves items={following.slice(0, 12)} onPlayItem={onPlayItem} onOpenPic={onOpenPic} />
        </section>
      )}

      {items.length === 0 ? (
        <div className="rounded-2xl border border-[#272727] bg-[#0f0f0f] px-6 py-16 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-white/10 flex items-center justify-center">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <p className="mt-4 text-sm font-medium text-zinc-200">No posts yet</p>
        </div>
      ) : (
        <MediaShelves items={items} onPlayItem={onPlayItem} onOpenPic={onOpenPic} filter={filter} />
      )}
      <Footer onNavigate={onNavigate} />
      </div>
    </div>
  )
}
