import { useMemo, useEffect } from 'react'
import { Radio } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getStableHomeFeed, getStableFollowingFeed, getWatchItem } from '../lib/contentService'
import { getPicsFeed } from '../lib/picsService'
import { listContinueWatching } from '../lib/watchProgress'
import { getActivePromotion, recordPromoClick } from '../lib/promotions'
import MediaShelves from './MediaShelves'
import ContentCard from './ContentCard'
import Footer from './Footer'
import HourlyHitsCarousel from './HourlyHitsCarousel'
import { preloadPostedItem, preloadPostedItems } from '../lib/preloadMedia'
import { useContentSyncTick } from '../lib/useContentSync'
import { isCatalogHydrated } from '../lib/catalogStore'
import { syncContentFromCloud } from '../lib/contentSync'
import { lsGet } from '../lib/storage'
import { listOnAirBoard, liveBadgeLabel } from '../lib/liveStatus'

const CATS = ['Just chatting', 'Gaming', 'IRL', 'Music', 'Creative', 'Sports']

export default function HomeFeed({ onPlayItem, onOpenPic, onOpenProfile, onNavigate }) {
  const { user } = useAuth()
  const syncTick = useContentSyncTick()
  const hydrated = isCatalogHydrated()
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

  const shelfCount = items.length + onAir.length

  const liveShelf = (
    <section>
      <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <Radio className="h-4 w-4 text-[#eb0400]" />
        Live now
      </h2>
      {onAir.length > 0 ? (
        <div className="flex gap-4 overflow-x-auto pb-2 chip-scroll">
          {onAir.slice(0, 8).map((s) => (
            <button
              key={s.userId}
              type="button"
              onClick={() => onNavigate?.('live')}
              className="w-[220px] shrink-0 text-left"
            >
              <div className="relative aspect-video overflow-hidden bg-[#121018] rounded-xl">
                <div className="absolute inset-0 bg-[#0c0c14]" />
                <span className="absolute top-2 left-2 px-1.5 py-0.5 bg-[#eb0400] text-white text-[10px] font-bold uppercase">
                  {liveBadgeLabel(s)}
                </span>
                <span className="absolute bottom-2 left-2 px-1.5 py-0.5 bg-black/80 text-white text-[10px] font-medium">
                  {Number(s.watchers) || 0} watching
                </span>
              </div>
              <p className="mt-2 text-sm font-medium text-white line-clamp-1">{s.title || 'Live'}</p>
              <p className="text-xs text-zinc-500">{s.displayName || s.handle}</p>
            </button>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-[#272727] bg-[#0f0f0f] px-5 py-10 text-center">
          <p className="text-sm font-semibold text-white">Lobby idle</p>
          <p className="mt-1 text-sm text-zinc-500">Live channels appear from ingest. Nothing is invented here.</p>
          {onNavigate ? (
            <button type="button" onClick={() => onNavigate('create')} className="mt-4 h-9 px-4 rounded-lg bg-white text-black text-xs font-semibold">
              Go live
            </button>
          ) : null}
        </div>
      )}
    </section>
  )

  return (
    <div className="w-full">
      <HourlyHitsCarousel onPlayItem={onPlayItem} onOpenPic={onOpenPic} onOpenProfile={onOpenProfile} />
      <div className="px-4 md:px-6 py-4 max-w-[1600px] mx-auto w-full space-y-6">
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
            <div className="absolute inset-0 bg-[#1a1a1a]" />
          )}
          <div className="relative p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Featured</p>
            <p className="text-lg font-semibold text-white mt-1">{promo.headline}</p>
            {promo.body ? <p className="text-sm text-zinc-300 mt-1 max-w-xl">{promo.body}</p> : null}
          </div>
        </button>
      )}

      {liveShelf}

      {featured && (
        <section>
          <h2 className="text-lg font-semibold text-white mb-4">Featured</h2>
          <div className="max-w-md">
            <ContentCard item={featured} onOpen={onPlayItem} onOpenProfile={onOpenProfile} variant={featured.type === 'short' ? 'short' : 'video'} />
          </div>
        </section>
      )}

      {continueItems.length > 0 && (
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

      {following.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-white mb-4">Following</h2>
          <MediaShelves items={following.slice(0, 12)} onPlayItem={onPlayItem} onOpenPic={onOpenPic} onOpenProfile={onOpenProfile} />
        </section>
      )}

      {!hydrated ? (
        <div className="rounded-2xl border border-[#272727] bg-[#0f0f0f] px-6 py-16 text-center">
          <p className="text-sm font-medium text-zinc-400">Loading posts…</p>
        </div>
      ) : shelfCount === 0 ? (
        <div className="rounded-2xl border border-[#272727] bg-[#0f0f0f] px-6 py-16 text-center">
          <p className="mt-0 text-sm font-medium text-zinc-200">No posts yet</p>
          <p className="mt-2 text-xs text-zinc-500">When creators publish, they show up here. Try Create (+) or Following.</p>
          {onNavigate ? (
            <button
              type="button"
              onClick={() => onNavigate('create')}
              className="mt-4 h-9 px-4 rounded-lg bg-white text-black text-xs font-semibold"
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
              className="w-36 sm:w-40 shrink-0 text-left"
            >
              <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-[#121018] border border-[#272727]">
                <div className="absolute inset-x-0 bottom-0 p-2.5">
                  <p className="text-sm font-semibold text-white">{c}</p>
                  <p className="text-xs text-zinc-500">Browse</p>
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
