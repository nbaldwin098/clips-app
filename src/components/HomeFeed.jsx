import { useMemo, useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { getStableHomeFeed, getStableFollowingFeed, getWatchItem } from '../lib/contentService'
import { getPicsFeed } from '../lib/picsService'
import { listContinueWatching } from '../lib/watchProgress'
import { getActivePromotion, recordPromoClick } from '../lib/promotions'
import MediaShelves from './MediaShelves'
import ContentCard from './ContentCard'
import Footer from './Footer'
import FilterChips from './FilterChips'
import ApexHomeStage from './home/ApexHomeStage'
import { preloadPostedItem, preloadPostedItems } from '../lib/preloadMedia'
import { useContentSyncTick } from '../lib/useContentSync'
import { isCatalogHydrated } from '../lib/catalogStore'
import { syncContentFromCloud } from '../lib/contentSync'
import { lsGet } from '../lib/storage'
import { listOnAirBoard } from '../lib/liveStatus'

const HOME_CHIPS = [
  { id: 'all', label: 'All' },
  { id: 'live', label: 'Live' },
  { id: 'video', label: 'Videos' },
  { id: 'clip', label: 'Clips' },
  { id: 'pic', label: 'Pics' },
]

const CATS = ['Just chatting', 'Gaming', 'IRL', 'Music', 'Creative', 'Sports']

export default function HomeFeed({
  onPlayItem,
  onOpenPic,
  onOpenProfile,
  onNavigate,
  onOpenAuth,
  onOpenCheckout,
  onSelectLive,
}) {
  const { user } = useAuth()
  const syncTick = useContentSyncTick()
  const hydrated = isCatalogHydrated()
  const [chip, setChip] = useState('all')
  const items = useMemo(() => {
    const feed = getStableHomeFeed(user?.id || null)
    const pics = (getPicsFeed() || []).map((p) => ({ ...p, type: 'pic' }))
    const seen = new Set(feed.map((i) => i.id))
    const extra = pics.filter((p) => p?.id && !seen.has(p.id))
    return [...feed, ...extra]
  }, [user?.id, syncTick])
  const following = useMemo(() => getStableFollowingFeed(user?.id || null), [user?.id, syncTick])
  const promo = useMemo(() => getActivePromotion(), [syncTick])
  const featured = useMemo(() => {
    const id = promo?.featureContentId || (promo?.destView === 'watch' ? promo.destId : '')
    return id ? getWatchItem(id) : null
  }, [promo, syncTick])
  const onAir = useMemo(
    () => listOnAirBoard(lsGet('live_board', []) || []),
    [syncTick]
  )
  const continueItems = useMemo(() => {
    if (!user?.id) return []
    return listContinueWatching(user.id).map((row) => getWatchItem(row.contentId)).filter((i) => i && i.type === 'video')
  }, [user?.id, syncTick])

  useEffect(() => {
    syncContentFromCloud(user).catch(() => {})
  }, [user?.id])

  useEffect(() => {
    preloadPostedItem(featured)
    preloadPostedItems(continueItems, 2)
    preloadPostedItems(items, 6)
  }, [featured, continueItems, items])

  const shelfCount = useMemo(() => {
    if (chip === 'video') return items.filter((i) => i.type === 'video').length
    if (chip === 'clip') return items.filter((i) => i.type === 'short').length
    if (chip === 'pic') return items.filter((i) => i.type === 'pic').length
    if (chip === 'live') return onAir.length
    return items.length + onAir.length
  }, [items, chip, onAir.length])

  return (
    <div className="w-full bg-black" data-home="apex">
      <ApexHomeStage
        onAir={onAir}
        onNavigate={onNavigate}
        onOpenProfile={onOpenProfile}
        onOpenAuth={onOpenAuth}
        onOpenCheckout={onOpenCheckout}
        onSelectLive={onSelectLive}
      />

      <div className="px-5 md:px-8 py-6 max-w-[1600px] mx-auto w-full space-y-6">
      {promo && promo.placement === 'home' && (
        <button
          type="button"
          onClick={() => {
            recordPromoClick(promo.id)
            if (featured) onPlayItem?.(featured)
            else onNavigate?.(promo.destView || 'home', promo.destId || '')
          }}
          className="apex-card relative w-full text-left overflow-hidden rounded-2xl min-h-[120px] border border-white/10"
        >
          {featured?.thumbUrl ? (
            <img src={featured.thumbUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
          ) : (
            <div className="absolute inset-0 bg-[#1a1a1a]" />
          )}
          <div className="relative p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#a0a0a0]">Featured</p>
            <p className="text-lg font-semibold text-white mt-1">{promo.headline}</p>
            {promo.body ? <p className="text-sm text-zinc-300 mt-1 max-w-xl">{promo.body}</p> : null}
          </div>
        </button>
      )}

      <FilterChips value={chip} onChange={setChip} options={HOME_CHIPS} />

      {featured && chip !== 'live' && (
        <section>
          <h2 className="text-lg font-semibold text-white mb-4">Featured</h2>
          <div className="max-w-md">
            <ContentCard item={featured} onOpen={onPlayItem} onOpenProfile={onOpenProfile} variant={featured.type === 'short' ? 'short' : 'video'} />
          </div>
        </section>
      )}

      {continueItems.length > 0 && chip !== 'live' && (
        <section>
          <h2 className="text-lg font-semibold text-white mb-4">Continue watching</h2>
          <div className="flex gap-4 overflow-x-auto pb-2 chip-scroll">
            {continueItems.slice(0, 8).map((item) => (
              <div key={item.id} className="w-[260px] sm:w-[280px] shrink-0">
                <ContentCard item={item} onOpen={onPlayItem} onOpenProfile={onOpenProfile} variant="video" />
              </div>
            ))}
          </div>
        </section>
      )}

      {following.length > 0 && chip !== 'live' && (
        <section>
          <h2 className="text-lg font-semibold text-white mb-4">Following</h2>
          <MediaShelves items={following.slice(0, 12)} onPlayItem={onPlayItem} onOpenPic={onOpenPic} onOpenProfile={onOpenProfile} />
        </section>
      )}

      {chip === 'live' ? null : !hydrated ? (
        <div className="rounded-2xl border border-white/10 bg-[#0a0a0a] px-6 py-16 text-center">
          <p className="text-sm font-medium text-zinc-400">Loading posts…</p>
        </div>
      ) : shelfCount === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-[#0a0a0a] px-6 py-16 text-center">
          <p className="mt-0 text-sm font-medium text-zinc-200">No posts yet</p>
          <p className="mt-2 text-xs text-zinc-500">When creators publish, they land here. Start with Create.</p>
          {onNavigate ? (
            <button
              type="button"
              onClick={() => onNavigate('create')}
              className="apex-pill mt-4 h-9 px-4 bg-white text-black text-xs font-semibold"
            >
              Create
            </button>
          ) : null}
        </div>
      ) : (
        <MediaShelves
          items={items}
          onPlayItem={onPlayItem}
          onOpenPic={onOpenPic}
          onOpenProfile={onOpenProfile}
          filter={chip}
        />
      )}

      <section>
        <h2 className="text-lg font-semibold text-white mb-4">Browse</h2>
        <div className="flex gap-3 overflow-x-auto pb-1 chip-scroll">
          {CATS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onNavigate?.('live')}
              className="apex-card w-36 sm:w-40 shrink-0 text-left"
            >
              <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-[#121018] border border-white/10">
                <div className="absolute inset-x-0 bottom-0 p-2.5">
                  <p className="text-sm font-semibold text-white">{c}</p>
                  <p className="text-xs text-[#8a8a8a]">Browse</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      <Footer onNavigate={onNavigate} />
      </div>
    </div>
  )
}
